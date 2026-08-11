/* Novels Community — static frontend powered by Supabase */
(() => {
  'use strict';

  const SUPABASE_URL = 'https://efftrxqdsrmyuaubjumh.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_C2qPiCHALCK9bvhFc8CpvA_Vc6tTGYo';

  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });

  const state = {
    user: null,
    profile: null,
    stories: [],
    ownStories: [],
    readerStory: null,
    readerChapters: [],
    readerChapterIndex: 0,
    likes: new Set(),
    bookmarks: new Set(),
  };

  const el = (id) => document.getElementById(id);
  const views = {
    discover: el('discoverView'),
    reader: el('readerView'),
    write: el('writeView'),
    profile: el('profileView'),
  };

  function escapeText(value) { return value == null ? '' : String(value); }
  function initials(value) {
    return escapeText(value).trim().split(/\s+/).filter(Boolean).slice(0,2).map(x => x[0]).join('').toUpperCase() || 'N';
  }
  function formatDate(value) {
    if (!value) return '';
    return new Intl.DateTimeFormat('en-GB', { day:'numeric', month:'short', year:'numeric' }).format(new Date(value));
  }
  function slugify(value) {
    return escapeText(value).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,90) || 'untitled';
  }
  function toast(message) {
    const node = el('toast');
    node.textContent = message;
    node.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => node.classList.remove('show'), 3000);
  }
  function setBusy(button, busy, label) {
    if (!button) return;
    if (busy) { button.dataset.oldText = button.textContent; button.textContent = label || 'Working…'; button.disabled = true; }
    else { button.textContent = button.dataset.oldText || button.textContent; button.disabled = false; }
  }
  function showAuthMessage(message, kind='error') {
    const node = el('authMessage');
    node.textContent = message;
    node.className = `form-message ${kind}`;
  }
  function clearAuthMessage() { el('authMessage').className = 'form-message hidden'; }

  function showView(name, { pushHash = true } = {}) {
    Object.values(views).forEach(v => v.classList.remove('active'));
    const view = views[name] || views.discover;
    view.classList.add('active');
    document.querySelectorAll('.nav-link').forEach(btn => btn.classList.toggle('active', btn.dataset.view === name));
    if (pushHash && name !== 'reader') history.replaceState(null, '', `#${name}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (name === 'write') loadWriterStudio();
    if (name === 'profile') loadProfileView();
  }

  function openAuth(mode='signin') {
    switchAuthTab(mode);
    clearAuthMessage();
    if (!el('authDialog').open) el('authDialog').showModal();
  }
  function switchAuthTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(b => b.classList.toggle('active', b.dataset.authTab === tab));
    el('signInForm').classList.toggle('hidden', tab !== 'signin');
    el('signUpForm').classList.toggle('hidden', tab !== 'signup');
  }

  async function ensureProfile() {
    if (!state.user) { state.profile = null; return null; }
    const { data, error } = await client.from('profiles').select('*').eq('id', state.user.id).maybeSingle();
    if (error) throw error;
    if (data) { state.profile = data; return data; }

    const meta = state.user.user_metadata || {};
    const base = slugify(meta.username || state.user.email?.split('@')[0] || `writer-${state.user.id.slice(0,6)}`).replace(/-/g,'_').slice(0,24);
    let username = base.length >= 3 ? base : `writer_${state.user.id.slice(0,6)}`;
    let inserted = null;
    for (let attempt=0; attempt<4 && !inserted; attempt++) {
      const candidate = attempt === 0 ? username : `${username}_${Math.floor(Math.random()*900+100)}`.slice(0,30);
      const payload = { id: state.user.id, username: candidate, display_name: escapeText(meta.display_name || meta.full_name || candidate).slice(0,80) };
      const response = await client.from('profiles').insert(payload).select().single();
      if (!response.error) inserted = response.data;
      else if (response.error.code !== '23505') throw response.error;
    }
    if (!inserted) throw new Error('Could not create a unique writer profile.');
    state.profile = inserted;
    return inserted;
  }

  async function refreshSession() {
    const { data: { session } } = await client.auth.getSession();
    state.user = session?.user || null;
    if (state.user) {
      try { await ensureProfile(); } catch (err) { console.error(err); toast('Signed in, but your profile could not be prepared.'); }
      await loadPersonalFlags();
    } else {
      state.profile = null;
      state.likes.clear(); state.bookmarks.clear();
    }
    updateAuthUI();
  }

  function updateAuthUI() {
    el('authButton').textContent = state.user ? 'Sign out' : 'Sign in';
    el('writeSignedOut').classList.toggle('hidden', !!state.user);
    el('writerStudio').classList.toggle('hidden', !state.user);
    el('profileSignedOut').classList.toggle('hidden', !!state.user);
    el('profileContent').classList.toggle('hidden', !state.user);
    el('commentForm').classList.toggle('hidden', !state.user);
    el('commentSignIn').classList.toggle('hidden', !!state.user);
  }

  async function loadPersonalFlags() {
    if (!state.user) return;
    const [likes, bookmarks] = await Promise.all([
      client.from('story_likes').select('story_id').eq('user_id', state.user.id),
      client.from('bookmarks').select('story_id').eq('user_id', state.user.id),
    ]);
    if (!likes.error) state.likes = new Set((likes.data || []).map(x => x.story_id));
    if (!bookmarks.error) state.bookmarks = new Set((bookmarks.data || []).map(x => x.story_id));
  }

  async function loadStories() {
    const { data, error } = await client.from('stories')
      .select('id,owner_id,author_name,title,slug,summary,genre,cover_url,is_featured,published_at,created_at')
      .eq('status','published')
      .order('is_featured',{ascending:false})
      .order('published_at',{ascending:false})
      .limit(60);
    if (error) {
      console.error(error); el('storyGrid').innerHTML = '<div class="empty-state"><h3>Stories could not be loaded.</h3><p>Please try again in a moment.</p></div>'; return;
    }
    state.stories = data || [];
    populateGenres();
    renderFeatured();
    renderFeed();
  }

  function populateGenres() {
    const select = el('genreFilter');
    const current = select.value;
    const genres = [...new Set(state.stories.map(s => s.genre).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
    select.innerHTML = '<option value="">All genres</option>';
    genres.forEach(genre => { const o=document.createElement('option'); o.value=genre; o.textContent=genre; select.append(o); });
    select.value = genres.includes(current) ? current : '';
  }

  function renderFeatured() {
    const story = state.stories.find(s => s.is_featured) || state.stories[0];
    const card = el('featuredStory'); card.replaceChildren();
    if (!story) {
      const box=document.createElement('div'); box.className='featured-content';
      const h=document.createElement('h2'); h.textContent='Your story could start here.'; box.append(h);
      const p=document.createElement('p'); p.textContent='Create an account and publish the first chapter.'; box.append(p); card.append(box); return;
    }
    const art=document.createElement('div'); art.className=`featured-art ${story.cover_url?'':'fallback'}`;
    if (story.cover_url) art.style.backgroundImage=`url("${story.cover_url.replace(/"/g,'')}")`;
    const content=document.createElement('div'); content.className='featured-content';
    const badge=document.createElement('span'); badge.className='badge'; badge.textContent='Featured story';
    const h=document.createElement('h2'); h.textContent=story.title;
    const author=document.createElement('div'); author.className='story-author'; author.textContent=`by ${story.author_name || 'Anonymous writer'}`;
    const p=document.createElement('p'); p.textContent=story.summary || 'Open the story and start reading.';
    const meta=document.createElement('div'); meta.className='featured-meta'; meta.textContent=[story.genre, formatDate(story.published_at)].filter(Boolean).join(' · ');
    const btn=document.createElement('button'); btn.className='button primary'; btn.textContent='Read now →'; btn.onclick=()=>openStory(story.slug);
    content.append(badge,h,author,p,meta,btn); card.append(art,content);
  }

  function renderFeed() {
    const query=el('storySearch').value.trim().toLowerCase();
    const genre=el('genreFilter').value;
    const filtered=state.stories.filter(s => {
      const hay=[s.title,s.author_name,s.genre,s.summary].join(' ').toLowerCase();
      return (!query || hay.includes(query)) && (!genre || s.genre===genre);
    });
    const grid=el('storyGrid'); grid.replaceChildren();
    el('feedEmpty').classList.toggle('hidden', filtered.length !== 0);
    filtered.forEach(story => grid.append(createStoryCard(story)));
  }

  function createStoryCard(story) {
    const card=document.createElement('article'); card.className='story-card'; card.tabIndex=0;
    const cover=document.createElement('div'); cover.className=`story-cover ${story.cover_url?'':'fallback'}`;
    if (story.cover_url) cover.style.backgroundImage=`url("${story.cover_url.replace(/"/g,'')}")`;
    const genre=document.createElement('span'); genre.className='story-genre'; genre.textContent=story.genre || 'Story'; cover.append(genre);
    const body=document.createElement('div'); body.className='story-card-body';
    const h=document.createElement('h3'); h.textContent=story.title;
    const author=document.createElement('div'); author.className='story-author'; author.textContent=`${story.author_name || 'Anonymous writer'}`;
    const p=document.createElement('p'); p.className='story-summary'; p.textContent=story.summary || 'No summary yet.';
    const footer=document.createElement('div'); footer.className='story-footer';
    const date=document.createElement('span'); date.textContent=formatDate(story.published_at);
    const action=document.createElement('span'); action.textContent='Read →'; footer.append(date,action);
    body.append(h,author,p,footer); card.append(cover,body);
    const open=()=>openStory(story.slug); card.onclick=open; card.onkeydown=e=>{ if(e.key==='Enter'||e.key===' ') open(); };
    return card;
  }


  function parseBalanceDueMaster(text, storyId) {
    const lines = text.replace(/\r/g, '').split('\n');
    const heading = /^(Prologue|Chapter \d+|Epilogue)$/;
    const starts = [];
    lines.forEach((line, index) => { if (heading.test(line.trim())) starts.push(index); });
    return starts.map((start, idx) => {
      const end = starts[idx + 1] ?? lines.length;
      const base = lines[start].trim();
      let bodyStart = start + 1;
      let title = base;
      if (base === 'Prologue' && lines[bodyStart]?.trim() === 'The Historical Record') { title += ' — The Historical Record'; bodyStart++; }
      if (base === 'Chapter 3' && lines[bodyStart]?.trim() === 'The Double Event') { title += ' — The Double Event'; bodyStart++; }
      return { id: `static-${idx + 1}`, story_id: storyId, position: idx + 1, title, content: lines.slice(bodyStart, end).join('\n').trim() };
    }).filter(chapter => chapter.content);
  }

  async function openStory(slug) {
    const { data: story, error } = await client.from('stories').select('*').eq('slug',slug).single();
    if (error) { toast('That story could not be opened.'); return; }
    const { data: chapters, error: chapterError } = await client.from('chapters').select('*').eq('story_id',story.id).order('position');
    if (chapterError) { toast('The chapters could not be loaded.'); return; }
    let resolvedChapters = chapters || [];
    // The launch edition of Balance Due is also kept as a version-controlled master in this repo.
    // Prefer that complete master when available, so the public reader always matches the published book files.
    if (story.slug === 'balance-due') {
      try {
        const response = await fetch('balance-due/final/Balance_Due_FINAL.txt', { cache: 'no-cache' });
        if (response.ok) {
          const staticChapters = parseBalanceDueMaster(await response.text(), story.id);
          if (staticChapters.length > resolvedChapters.length) resolvedChapters = staticChapters;
        }
      } catch (err) { console.warn('Static Balance Due master unavailable; using database chapters.', err); }
    }
    state.readerStory=story; state.readerChapters=resolvedChapters; state.readerChapterIndex=0;
    renderReaderMeta(); renderChapterNav(); renderReaderChapter(); await refreshStorySocial();
    showView('reader',{pushHash:false});
    history.replaceState(null,'',`?story=${encodeURIComponent(story.slug)}#reader`);
  }

  function renderReaderMeta() {
    const s=state.readerStory; if(!s) return;
    const cover=el('readerCover'); cover.style.backgroundImage=s.cover_url?`url("${s.cover_url.replace(/"/g,'')}")`:'';
    const meta=el('readerMeta'); meta.replaceChildren();
    const h=document.createElement('h1'); h.textContent=s.title;
    const a=document.createElement('div'); a.className='story-author'; a.textContent=`by ${s.author_name || 'Anonymous writer'}`;
    const info=document.createElement('p'); info.className='muted'; info.textContent=[s.genre,formatDate(s.published_at)].filter(Boolean).join(' · ');
    const sum=document.createElement('p'); sum.className='reader-summary'; sum.textContent=s.summary || '';
    meta.append(h,a,info,sum);
    updateSocialButtons();
    el('followButton').classList.toggle('hidden', !state.user || !s.owner_id || s.owner_id===state.user?.id);
  }

  function renderChapterNav() {
    const nav=el('chapterNav'); nav.replaceChildren();
    state.readerChapters.forEach((chapter,index)=>{
      const b=document.createElement('button'); b.className='chapter-link'; b.textContent=chapter.title; b.onclick=()=>{state.readerChapterIndex=index;renderReaderChapter();}; nav.append(b);
    });
  }

  function renderReaderChapter() {
    const chapter=state.readerChapters[state.readerChapterIndex];
    const container=el('readerChapter'); container.replaceChildren();
    document.querySelectorAll('.chapter-link').forEach((b,i)=>b.classList.toggle('active',i===state.readerChapterIndex));
    if (!chapter) {
      const h=document.createElement('h2'); h.textContent='This story is waiting for its first chapter.'; container.append(h);
    } else {
      const h=document.createElement('h2'); h.textContent=chapter.title; container.append(h);
      escapeText(chapter.content).split(/\n\s*\n|\n/).map(x=>x.trim()).filter(Boolean).forEach(text=>{ const p=document.createElement('p'); p.textContent=text; container.append(p); });
    }
    el('prevChapter').disabled=state.readerChapterIndex<=0;
    el('nextChapter').disabled=state.readerChapterIndex>=state.readerChapters.length-1;
    window.scrollTo({top:0,behavior:'smooth'});
  }

  async function refreshStorySocial() {
    const s=state.readerStory; if(!s) return;
    const [likes,comments] = await Promise.all([
      client.from('story_likes').select('user_id',{count:'exact',head:true}).eq('story_id',s.id),
      client.from('comments').select('id,body,created_at,user_id,profiles!comments_user_id_fkey(username,display_name,avatar_url)').eq('story_id',s.id).order('created_at',{ascending:false}).limit(100),
    ]);
    el('likeCount').textContent=likes.count ? `(${likes.count})` : '';
    renderComments(comments.error?[]:(comments.data||[]));
    if (comments.error) console.warn(comments.error);
    updateSocialButtons();
  }

  function renderComments(comments) {
    el('commentCount').textContent=`${comments.length} comment${comments.length===1?'':'s'}`;
    const list=el('commentsList'); list.replaceChildren();
    comments.forEach(c=>{
      const row=document.createElement('article'); row.className='comment';
      const head=document.createElement('div'); head.className='comment-head';
      const strong=document.createElement('strong'); strong.textContent=c.profiles?.display_name || c.profiles?.username || 'Writer';
      const date=document.createElement('span'); date.textContent=formatDate(c.created_at); head.append(strong,date);
      const p=document.createElement('p'); p.textContent=c.body; row.append(head,p); list.append(row);
    });
  }

  function updateSocialButtons() {
    const s=state.readerStory; if(!s) return;
    const liked=state.likes.has(s.id); const saved=state.bookmarks.has(s.id);
    el('likeButton').childNodes[0].nodeValue = liked ? '♥ Liked ' : '♡ Like ';
    el('bookmarkButton').textContent=saved?'✓ Saved':'＋ Save';
  }

  async function toggleLike() {
    if(!state.user) return openAuth('signin');
    const s=state.readerStory; if(!s)return;
    if(state.likes.has(s.id)) {
      const {error}=await client.from('story_likes').delete().eq('story_id',s.id).eq('user_id',state.user.id); if(error)return toast('Could not remove like.'); state.likes.delete(s.id);
    } else {
      const {error}=await client.from('story_likes').insert({story_id:s.id,user_id:state.user.id}); if(error)return toast('Could not like story.'); state.likes.add(s.id);
    }
    await refreshStorySocial();
  }
  async function toggleBookmark() {
    if(!state.user) return openAuth('signin');
    const s=state.readerStory; if(!s)return;
    if(state.bookmarks.has(s.id)) {
      const {error}=await client.from('bookmarks').delete().eq('story_id',s.id).eq('user_id',state.user.id); if(error)return toast('Could not remove saved story.'); state.bookmarks.delete(s.id);
    } else {
      const {error}=await client.from('bookmarks').insert({story_id:s.id,user_id:state.user.id}); if(error)return toast('Could not save story.'); state.bookmarks.add(s.id);
    }
    updateSocialButtons();
  }
  async function toggleFollow() {
    if(!state.user) return openAuth('signin');
    const s=state.readerStory; if(!s?.owner_id || s.owner_id===state.user.id)return;
    const {data}=await client.from('follows').select('following_id').eq('follower_id',state.user.id).eq('following_id',s.owner_id).maybeSingle();
    if(data) { await client.from('follows').delete().eq('follower_id',state.user.id).eq('following_id',s.owner_id); toast('Unfollowed writer.'); }
    else { const {error}=await client.from('follows').insert({follower_id:state.user.id,following_id:s.owner_id}); if(error)return toast('Could not follow writer.'); toast('Writer followed.'); }
  }

  async function loadWriterStudio() {
    if(!state.user)return;
    const {data,error}=await client.from('stories').select('*').eq('owner_id',state.user.id).order('updated_at',{ascending:false});
    if(error){toast('Could not load your stories.');return;}
    state.ownStories=data||[]; renderOwnStories();
  }
  function renderOwnStories() {
    const box=el('myStories'), select=el('chapterStory'); box.replaceChildren(); select.replaceChildren();
    if(!state.ownStories.length){ const p=document.createElement('p');p.className='muted';p.textContent='No stories yet. Your first one starts on the left.';box.append(p); const o=document.createElement('option');o.textContent='Create a story first';o.value='';select.append(o);return; }
    state.ownStories.forEach(s=>{
      const row=document.createElement('div');row.className='my-story-row';
      const text=document.createElement('div');const h=document.createElement('h4');h.textContent=s.title;const small=document.createElement('small');small.textContent=`Updated ${formatDate(s.updated_at)}`;text.append(h,small);
      const status=document.createElement('button');status.type='button';status.className=`status-pill ${s.status}`;status.textContent=s.status;status.title='Click to toggle draft/published';status.onclick=()=>toggleStoryStatus(s);
      row.append(text,status);box.append(row);
      const o=document.createElement('option');o.value=s.id;o.textContent=s.title;select.append(o);
    });
  }
  async function toggleStoryStatus(story) {
    const status=story.status==='published'?'draft':'published';
    const changes={status,published_at:status==='published'?(story.published_at||new Date().toISOString()):story.published_at};
    const {error}=await client.from('stories').update(changes).eq('id',story.id); if(error)return toast('Status could not be changed.'); toast(`Story is now ${status}.`); await Promise.all([loadWriterStudio(),loadStories()]);
  }

  async function loadProfileView() {
    if(!state.user)return; await ensureProfile();
    const p=state.profile;
    el('profileDisplayName').textContent=p.display_name||p.username;
    el('profileUsername').textContent=`@${p.username}`;
    el('profileBio').textContent=p.bio||'No bio yet.';
    el('profileUsernameInput').value=p.username||''; el('profileDisplayInput').value=p.display_name||''; el('profileBioInput').value=p.bio||''; el('profileAvatarInput').value=p.avatar_url||'';
    const avatar=el('profileAvatar');avatar.textContent=p.avatar_url?'':initials(p.display_name||p.username);avatar.style.backgroundImage=p.avatar_url?`url("${p.avatar_url.replace(/"/g,'')}")`:'';
    const [stories,followers,following,bookmarks]=await Promise.all([
      client.from('stories').select('id',{count:'exact',head:true}).eq('owner_id',state.user.id),
      client.from('follows').select('follower_id',{count:'exact',head:true}).eq('following_id',state.user.id),
      client.from('follows').select('following_id',{count:'exact',head:true}).eq('follower_id',state.user.id),
      client.from('bookmarks').select('story_id,stories(id,title,slug,author_name,genre,status)').eq('user_id',state.user.id).order('created_at',{ascending:false}),
    ]);
    const stats=el('profileStats');stats.replaceChildren();
    [[stories.count||0,'stories'],[followers.count||0,'followers'],[following.count||0,'following']].forEach(([n,label])=>{const d=document.createElement('div');const strong=document.createElement('strong');strong.textContent=n;d.append(strong,document.createTextNode(label));stats.append(d);});
    const saved=el('bookmarkedStories');saved.replaceChildren();
    (bookmarks.data||[]).filter(x=>x.stories?.status==='published').forEach(x=>{const row=document.createElement('div');row.className='my-story-row';const d=document.createElement('div');const h=document.createElement('h4');h.textContent=x.stories.title;const s=document.createElement('small');s.textContent=`${x.stories.author_name} · ${x.stories.genre}`;d.append(h,s);const b=document.createElement('button');b.className='button ghost';b.textContent='Read';b.onclick=()=>openStory(x.stories.slug);row.append(d,b);saved.append(row);});
    if(!saved.children.length){const p2=document.createElement('p');p2.className='muted';p2.textContent='Save stories while reading and they will appear here.';saved.append(p2);}
  }

  async function submitSignIn(event) {
    event.preventDefault(); clearAuthMessage(); const btn=event.submitter;setBusy(btn,true,'Signing in…');
    const {error}=await client.auth.signInWithPassword({email:el('signInEmail').value.trim(),password:el('signInPassword').value});
    setBusy(btn,false); if(error)return showAuthMessage(error.message);
    el('authDialog').close(); await refreshSession(); toast('Welcome back.');
  }
  async function submitSignUp(event) {
    event.preventDefault(); clearAuthMessage(); const btn=event.submitter;setBusy(btn,true,'Creating account…');
    const username=el('signUpUsername').value.trim();
    if(!/^[A-Za-z0-9_-]{3,30}$/.test(username)){setBusy(btn,false);return showAuthMessage('Username must be 3–30 characters using letters, numbers, _ or -.');}
    const {data,error}=await client.auth.signUp({email:el('signUpEmail').value.trim(),password:el('signUpPassword').value,options:{data:{username,display_name:el('signUpDisplay').value.trim()}}});
    setBusy(btn,false); if(error)return showAuthMessage(error.message);
    if(data.session){await refreshSession();el('authDialog').close();toast('Writer account created.');}
    else showAuthMessage('Account created. Check your email to confirm it, then come back and sign in.','success');
  }
  async function submitStory(event) {
    event.preventDefault(); if(!state.user)return openAuth('signin'); const btn=event.submitter;setBusy(btn,true,'Creating…');
    let slug=slugify(el('storyTitle').value); const suffix=()=>Math.random().toString(36).slice(2,6);
    for(let attempt=0;attempt<4;attempt++){
      const payload={owner_id:state.user.id,author_name:state.profile?.display_name||state.profile?.username||'Writer',title:el('storyTitle').value.trim(),slug:attempt?`${slug}-${suffix()}`:slug,summary:el('storySummary').value.trim(),genre:el('storyGenre').value.trim()||'Other',cover_url:el('storyCover').value.trim()||null,status:el('storyStatus').value,published_at:el('storyStatus').value==='published'?new Date().toISOString():null};
      const {error}=await client.from('stories').insert(payload); if(!error){event.target.reset();setBusy(btn,false);toast('Story created. Add its first chapter below.');await Promise.all([loadWriterStudio(),loadStories()]);return;} if(error.code!=='23505'){setBusy(btn,false);toast(error.message);return;}
    }
    setBusy(btn,false);toast('Could not create a unique story URL. Try a slightly different title.');
  }
  async function submitChapter(event) {
    event.preventDefault(); if(!state.user)return openAuth('signin'); const storyId=el('chapterStory').value;if(!storyId)return toast('Create a story first.'); const btn=event.submitter;setBusy(btn,true,'Adding chapter…');
    const {data,error}=await client.from('chapters').select('position').eq('story_id',storyId).order('position',{ascending:false}).limit(1);
    if(error){setBusy(btn,false);return toast('Could not determine chapter position.');}
    const position=(data?.[0]?.position||0)+1;
    const response=await client.from('chapters').insert({story_id:storyId,position,title:el('chapterTitle').value.trim(),content:el('chapterContent').value.trim()});
    setBusy(btn,false);if(response.error)return toast(response.error.message);el('chapterTitle').value='';el('chapterContent').value='';toast(`Chapter ${position} added.`);
  }
  async function submitProfile(event) {
    event.preventDefault(); const btn=event.submitter;setBusy(btn,true,'Saving…');
    const payload={username:el('profileUsernameInput').value.trim(),display_name:el('profileDisplayInput').value.trim(),bio:el('profileBioInput').value.trim(),avatar_url:el('profileAvatarInput').value.trim()||null};
    const {data,error}=await client.from('profiles').update(payload).eq('id',state.user.id).select().single();setBusy(btn,false);if(error)return toast(error.message);state.profile=data;toast('Profile saved.');await loadProfileView();
  }
  async function submitComment(event) {
    event.preventDefault(); if(!state.user)return openAuth('signin'); const body=el('commentBody').value.trim();if(!body)return;const btn=event.submitter;setBusy(btn,true,'Posting…');
    const {error}=await client.from('comments').insert({story_id:state.readerStory.id,user_id:state.user.id,body});setBusy(btn,false);if(error)return toast(error.message);el('commentBody').value='';await refreshStorySocial();
  }

  function wireEvents() {
    document.querySelectorAll('[data-view]').forEach(btn=>btn.addEventListener('click',()=>showView(btn.dataset.view)));
    document.querySelectorAll('[data-view-jump]').forEach(btn=>btn.addEventListener('click',()=>showView(btn.dataset.viewJump)));
    document.querySelectorAll('[data-open-auth]').forEach(btn=>btn.addEventListener('click',()=>openAuth(btn.dataset.openAuth)));
    document.querySelectorAll('.auth-tab').forEach(btn=>btn.addEventListener('click',()=>switchAuthTab(btn.dataset.authTab)));
    el('closeAuth').onclick=()=>el('authDialog').close();
    el('authButton').onclick=async()=>{if(state.user){await client.auth.signOut();state.user=null;state.profile=null;updateAuthUI();showView('discover');toast('Signed out.');}else openAuth('signin');};
    el('newStoryButton').onclick=()=>state.user?showView('write'):openAuth('signup');
    el('browseButton').onclick=()=>el('storyFeedSection').scrollIntoView({behavior:'smooth'});
    el('readerBack').onclick=()=>{history.replaceState(null,'',location.pathname+'#discover');showView('discover',{pushHash:false});};
    el('prevChapter').onclick=()=>{if(state.readerChapterIndex>0){state.readerChapterIndex--;renderReaderChapter();}};
    el('nextChapter').onclick=()=>{if(state.readerChapterIndex<state.readerChapters.length-1){state.readerChapterIndex++;renderReaderChapter();}};
    el('likeButton').onclick=toggleLike;el('bookmarkButton').onclick=toggleBookmark;el('followButton').onclick=toggleFollow;
    el('storySearch').addEventListener('input',renderFeed);el('genreFilter').addEventListener('change',renderFeed);
    el('signInForm').addEventListener('submit',submitSignIn);el('signUpForm').addEventListener('submit',submitSignUp);el('storyForm').addEventListener('submit',submitStory);el('chapterForm').addEventListener('submit',submitChapter);el('profileForm').addEventListener('submit',submitProfile);el('commentForm').addEventListener('submit',submitComment);
    window.addEventListener('hashchange',()=>{const name=location.hash.replace('#','');if(['discover','write','profile'].includes(name))showView(name,{pushHash:false});});
    client.auth.onAuthStateChange(async(_event,session)=>{state.user=session?.user||null;if(state.user){try{await ensureProfile();await loadPersonalFlags();}catch(e){console.error(e);}}else{state.profile=null;}updateAuthUI();});
  }

  async function boot() {
    wireEvents();
    await refreshSession();
    await loadStories();
    const params=new URLSearchParams(location.search); const slug=params.get('story');
    if(slug) await openStory(slug); else { const initial=location.hash.replace('#',''); showView(['write','profile'].includes(initial)?initial:'discover',{pushHash:false}); }
  }

  boot().catch(err=>{console.error(err);toast('Novels hit a loading problem. Refresh to try again.');});
})();
