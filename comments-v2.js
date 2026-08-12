/* Writelite — attributed comments + threaded replies V2 */
(() => {
  'use strict';

  const SUPABASE_URL = 'https://efftrxqdsrmyuaubjumh.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_C2qPiCHALCK9bvhFc8CpvA_Vc6tTGYo';
  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });

  let scheduled = false;
  let lastStoryId = null;

  function initials(value) {
    return String(value || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase() || 'W';
  }

  function formatDate(value) {
    if (!value) return '';
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }).format(new Date(value));
  }

  function installStyles() {
    if (document.getElementById('commentsV2Styles')) return;
    const style = document.createElement('style');
    style.id = 'commentsV2Styles';
    style.textContent = `
      .comments-v2-thread{display:grid;gap:18px}
      .comment-v2{border-bottom:1px solid rgba(36,31,26,.1);padding:0 0 16px}
      .comment-v2.reply-v2{margin:12px 0 0 42px;padding:12px 14px;border:1px solid rgba(36,31,26,.10);border-radius:12px;background:rgba(255,255,255,.22)}
      .comment-v2-head{display:flex;align-items:center;gap:9px;min-width:0}
      .comment-v2-avatar{width:32px;height:32px;border-radius:50%;background:#d9d0c4 center/cover no-repeat;display:grid;place-items:center;flex:0 0 auto;font:700 11px/1 system-ui;color:#493f35;overflow:hidden}
      .comment-v2-identity{min-width:0;display:flex;align-items:baseline;gap:6px;flex-wrap:wrap}
      .comment-v2-name{border:0;background:transparent;padding:0;color:var(--paper-ink,#241f1a);font-weight:800;cursor:pointer;text-align:left}
      .comment-v2-name:hover{text-decoration:underline}
      .comment-v2-username,.comment-v2-date{font-size:11px;color:#7d746b}
      .comment-v2-author{display:inline-flex;align-items:center;padding:3px 6px;border-radius:999px;background:rgba(232,168,86,.16);border:1px solid rgba(181,117,37,.28);color:#7a4d15;font-size:9px;font-weight:900;letter-spacing:.7px;text-transform:uppercase}
      .comment-v2-body{font-family:var(--sans,system-ui)!important;font-size:14px!important;line-height:1.55!important;text-indent:0!important;margin:9px 0 8px!important;white-space:pre-wrap}
      .comment-v2-actions{display:flex;gap:8px;align-items:center}
      .comment-v2-reply-btn{border:0;background:transparent;color:#75695e;font-size:12px;font-weight:800;padding:3px 0}
      .comment-v2-reply-btn:hover{color:#3e352e;text-decoration:underline}
      .comment-v2-form{display:grid;gap:8px;margin:10px 0 0 42px}
      .comment-v2-form textarea{background:rgba(255,255,255,.58)!important;color:var(--paper-ink,#241f1a)!important;border-color:rgba(36,31,26,.16)!important;min-height:82px}
      .comment-v2-form-actions{display:flex;justify-content:flex-end;gap:8px}
      .comment-v2-form button{border:1px solid rgba(36,31,26,.18);border-radius:9px;padding:7px 11px;background:transparent;color:var(--paper-ink,#241f1a);font-weight:800}
      .comment-v2-form button.primary-v2{background:#2a221a;color:#fff;border-color:#2a221a}
      .comment-v2-empty{color:#756d64;padding:12px 0}
      @media(max-width:600px){.comment-v2.reply-v2,.comment-v2-form{margin-left:20px}.comment-v2-identity{gap:4px}.comment-v2-date{width:100%;margin-left:0}}
    `;
    document.head.append(style);
  }

  function currentSlug() {
    return new URLSearchParams(location.search).get('story');
  }

  function profileUrl(username) {
    const url = new URL(location.href);
    url.search = '';
    url.searchParams.set('writer', username);
    url.hash = 'writer';
    return url.toString();
  }

  async function getSessionUser() {
    const { data: { session } } = await client.auth.getSession();
    return session?.user || null;
  }

  async function loadStory(slug) {
    if (!slug) return null;
    const { data, error } = await client.from('stories')
      .select('id,owner_id,title,slug,genre')
      .eq('slug', slug)
      .maybeSingle();
    if (error) {
      console.warn('Comment story lookup failed', error);
      return null;
    }
    return data;
  }

  async function loadComments(storyId) {
    const { data, error } = await client.from('comments')
      .select('id,story_id,user_id,parent_id,body,created_at,updated_at,profiles!comments_user_id_fkey(username,display_name,avatar_url)')
      .eq('story_id', storyId)
      .order('created_at', { ascending: true })
      .limit(250);
    if (error) {
      console.warn('Comment load failed', error);
      return [];
    }
    return data || [];
  }

  function buildAvatar(profile) {
    const avatar = document.createElement('div');
    avatar.className = 'comment-v2-avatar';
    if (profile?.avatar_url) {
      avatar.style.backgroundImage = `url("${String(profile.avatar_url).replace(/"/g, '')}")`;
      avatar.textContent = '';
    } else {
      avatar.textContent = initials(profile?.display_name || profile?.username || 'Writer');
    }
    return avatar;
  }

  function buildIdentity(comment, story) {
    const profile = comment.profiles || {};
    const wrap = document.createElement('div');
    wrap.className = 'comment-v2-identity';

    const name = document.createElement('button');
    name.type = 'button';
    name.className = 'comment-v2-name';
    name.textContent = profile.display_name || profile.username || 'Writer';
    if (profile.username) {
      name.title = `View @${profile.username}`;
      name.onclick = () => { location.href = profileUrl(profile.username); };
    } else {
      name.disabled = true;
    }

    wrap.append(name);

    if (profile.username) {
      const username = document.createElement('span');
      username.className = 'comment-v2-username';
      username.textContent = `@${profile.username}`;
      wrap.append(username);
    }

    if (comment.user_id === story.owner_id) {
      const badge = document.createElement('span');
      badge.className = 'comment-v2-author';
      badge.textContent = 'Author';
      wrap.append(badge);
    }

    const date = document.createElement('span');
    date.className = 'comment-v2-date';
    date.textContent = formatDate(comment.created_at);
    wrap.append(date);
    return wrap;
  }

  async function postReply(story, parentId, textarea, submitButton) {
    const user = await getSessionUser();
    if (!user) {
      document.getElementById('authButton')?.click();
      return;
    }
    const body = textarea.value.trim();
    if (!body) return;
    submitButton.disabled = true;
    submitButton.textContent = 'Posting…';
    const { error } = await client.from('comments').insert({
      story_id: story.id,
      user_id: user.id,
      parent_id: parentId,
      body,
    });
    submitButton.disabled = false;
    submitButton.textContent = 'Reply';
    if (error) {
      console.warn('Reply failed', error);
      const toast = document.getElementById('toast');
      if (toast) {
        toast.textContent = error.message || 'Could not post reply.';
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
      }
      return;
    }
    await enhanceComments(true);
  }

  function makeReplyForm(story, parentId, host) {
    if (host.querySelector('.comment-v2-form')) return;
    const form = document.createElement('form');
    form.className = 'comment-v2-form';
    const textarea = document.createElement('textarea');
    textarea.maxLength = 2000;
    textarea.rows = 3;
    textarea.placeholder = 'Write a reply…';
    textarea.required = true;
    const actions = document.createElement('div');
    actions.className = 'comment-v2-form-actions';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.textContent = 'Cancel';
    cancel.onclick = () => form.remove();
    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.className = 'primary-v2';
    submit.textContent = 'Reply';
    actions.append(cancel, submit);
    form.append(textarea, actions);
    form.onsubmit = async (event) => {
      event.preventDefault();
      await postReply(story, parentId, textarea, submit);
    };
    host.append(form);
    setTimeout(() => textarea.focus(), 0);
  }

  function renderComment(comment, story, user, isReply = false, rootParentId = null) {
    const row = document.createElement('article');
    row.className = `comment-v2${isReply ? ' reply-v2' : ''}`;
    row.dataset.commentId = comment.id;

    const head = document.createElement('div');
    head.className = 'comment-v2-head';
    head.append(buildAvatar(comment.profiles), buildIdentity(comment, story));

    const body = document.createElement('p');
    body.className = 'comment-v2-body';
    body.textContent = comment.body;

    const actions = document.createElement('div');
    actions.className = 'comment-v2-actions';
    if (user) {
      const reply = document.createElement('button');
      reply.type = 'button';
      reply.className = 'comment-v2-reply-btn';
      reply.textContent = comment.user_id === story.owner_id ? 'Reply to author' : 'Reply';
      const targetParent = rootParentId || comment.id;
      reply.onclick = () => makeReplyForm(story, targetParent, row);
      actions.append(reply);
    }

    row.append(head, body, actions);
    return row;
  }

  async function renderThread(story, comments) {
    const list = document.getElementById('commentsList');
    if (!list) return;
    const user = await getSessionUser();
    const roots = comments.filter(c => !c.parent_id);
    const repliesByParent = new Map();
    comments.filter(c => c.parent_id).forEach(reply => {
      const arr = repliesByParent.get(reply.parent_id) || [];
      arr.push(reply);
      repliesByParent.set(reply.parent_id, arr);
    });

    list.replaceChildren();
    list.dataset.commentsV2Story = story.id;
    const thread = document.createElement('div');
    thread.className = 'comments-v2-thread';

    if (!roots.length) {
      const empty = document.createElement('div');
      empty.className = 'comment-v2-empty';
      empty.textContent = 'No reader notes yet. Be the first to leave one.';
      thread.append(empty);
    }

    roots.forEach(root => {
      const wrapper = document.createElement('div');
      const rootNode = renderComment(root, story, user, false, null);
      wrapper.append(rootNode);
      (repliesByParent.get(root.id) || []).forEach(reply => {
        wrapper.append(renderComment(reply, story, user, true, root.id));
      });
      thread.append(wrapper);
    });

    list.append(thread);

    const replyCount = comments.filter(c => c.parent_id).length;
    const count = document.getElementById('commentCount');
    if (count) {
      const rootText = `${roots.length} comment${roots.length === 1 ? '' : 's'}`;
      count.textContent = replyCount ? `${rootText} · ${replyCount} repl${replyCount === 1 ? 'y' : 'ies'}` : rootText;
    }
  }

  async function enhanceComments(force = false) {
    const list = document.getElementById('commentsList');
    const reader = document.getElementById('readerView');
    if (!list || !reader?.classList.contains('active')) return;
    if (!force && list.querySelector('.comments-v2-thread')) return;
    const slug = currentSlug();
    if (!slug) return;
    const story = await loadStory(slug);
    if (!story) return;
    lastStoryId = story.id;
    const comments = await loadComments(story.id);
    await renderThread(story, comments);
  }

  function scheduleEnhance() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(async () => {
      scheduled = false;
      await enhanceComments(false);
    }, 80);
  }

  function boot() {
    installStyles();
    const list = document.getElementById('commentsList');
    if (list) {
      new MutationObserver(() => {
        if (!list.querySelector('.comments-v2-thread')) scheduleEnhance();
      }).observe(list, { childList: true });
    }
    const reader = document.getElementById('readerView');
    if (reader) {
      new MutationObserver(scheduleEnhance).observe(reader, { attributes: true, attributeFilter: ['class'] });
    }
    window.addEventListener('popstate', scheduleEnhance);
    window.addEventListener('hashchange', scheduleEnhance);
    client.auth.onAuthStateChange(() => setTimeout(() => enhanceComments(true), 120));
    [150, 500, 1200].forEach(delay => setTimeout(scheduleEnhance, delay));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
