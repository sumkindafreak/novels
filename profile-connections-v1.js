/* Novels Community — follower/following profile browser */
(() => {
  'use strict';

  const SUPABASE_URL = 'https://efftrxqdsrmyuaubjumh.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_C2qPiCHALCK9bvhFc8CpvA_Vc6tTGYo';
  const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });

  const $ = (id) => document.getElementById(id);
  const text = (value) => value == null ? '' : String(value);
  const initials = (value) => text(value).trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'N';

  let currentUser = null;
  let decorating = false;

  function injectStyles() {
    if ($('profileConnectionsStyles')) return;
    const style = document.createElement('style');
    style.id = 'profileConnectionsStyles';
    style.textContent = `
      .connection-stat-launch{cursor:pointer;border-radius:10px;transition:background .16s ease,color .16s ease,transform .16s ease;outline:none}
      .connection-stat-launch:hover{background:rgba(143,124,255,.10);color:#d9d0ff!important}
      .connection-stat-launch:focus-visible{box-shadow:0 0 0 2px #8f7cff}
      .profile-stats .connection-stat-launch{padding:8px 10px;margin:-8px -10px}
      .writer-stats-launch .connection-stat-launch{padding:5px 8px;margin:-5px -8px}
      .connections-dialog-launch{border:1px solid #343b4e;border-radius:20px;background:#151923;color:#eef2f7;padding:0;width:min(560px,92vw);max-height:min(720px,84vh);overflow:hidden;box-shadow:0 28px 90px rgba(0,0,0,.55)}
      .connections-dialog-launch::backdrop{background:rgba(0,0,0,.72);backdrop-filter:blur(3px)}
      .connections-dialog-pad{padding:20px}
      .connections-list-launch{display:grid;gap:8px;max-height:62vh;overflow:auto;padding:4px 2px 2px}
      .connection-row-launch{width:100%;display:grid;grid-template-columns:50px minmax(0,1fr) auto;gap:12px;align-items:center;border:1px solid rgba(255,255,255,.09);border-radius:14px;background:rgba(255,255,255,.025);color:inherit;text-align:left;padding:10px 12px;cursor:pointer}
      .connection-row-launch:hover{background:rgba(143,124,255,.09);border-color:rgba(143,124,255,.35)}
      .connection-avatar-launch{width:50px;height:50px;border-radius:50%;background:#292f40;background-size:cover;background-position:center;display:grid;place-items:center;font-weight:800;flex:none}
      .connection-copy-launch{min-width:0}.connection-copy-launch strong,.connection-copy-launch span,.connection-copy-launch small{display:block}.connection-copy-launch strong{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.connection-copy-launch span{color:#9aa3b2;margin-top:2px}.connection-copy-launch small{color:#7f8899;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .connection-open-launch{color:#bba8ff;font-size:.86rem;white-space:nowrap}
      .connections-empty-launch{padding:28px 10px;text-align:center;color:#9aa3b2}
      .connections-loading-launch{padding:24px 10px;text-align:center;color:#9aa3b2}
      @media(max-width:560px){.connection-row-launch{grid-template-columns:44px minmax(0,1fr)}.connection-avatar-launch{width:44px;height:44px}.connection-open-launch{display:none}}
    `;
    document.head.append(style);
  }

  function injectDialog() {
    if ($('connectionsDialogLaunch')) return;
    const dialog = document.createElement('dialog');
    dialog.id = 'connectionsDialogLaunch';
    dialog.className = 'connections-dialog-launch';
    dialog.innerHTML = `
      <div class="connections-dialog-pad">
        <div class="panel-heading">
          <div>
            <span class="eyebrow" id="connectionsEyebrowLaunch">Writers</span>
            <h2 id="connectionsTitleLaunch">Followers</h2>
          </div>
          <button id="closeConnectionsLaunch" class="button ghost" type="button">Close</button>
        </div>
        <div id="connectionsListLaunch" class="connections-list-launch" aria-live="polite"></div>
      </div>`;
    document.body.append(dialog);
    $('closeConnectionsLaunch').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });
  }

  async function refreshUser() {
    const { data: { session } } = await db.auth.getSession();
    currentUser = session?.user || null;
  }

  function markInteractive(node, kind, profileId = '', username = '') {
    if (!node) return;
    node.classList.add('connection-stat-launch');
    node.dataset.connectionKind = kind;
    if (profileId) node.dataset.connectionProfileId = profileId;
    if (username) node.dataset.connectionUsername = username;
    node.setAttribute('role', 'button');
    node.setAttribute('tabindex', '0');
    node.setAttribute('aria-label', `View ${kind}`);
  }

  function decorateOwnProfileStats() {
    const stats = $('profileStats');
    if (!stats || stats.children.length < 3 || !currentUser) return;
    markInteractive(stats.children[1], 'followers', currentUser.id);
    markInteractive(stats.children[2], 'following', currentUser.id);
  }

  function decorateWriterStats() {
    const view = $('writerViewLaunch');
    if (!view) return;
    const stats = view.querySelector('.writer-stats-launch');
    if (!stats) return;
    const username = new URLSearchParams(location.search).get('writer') || '';
    [...stats.children].forEach(node => {
      const label = node.textContent.toLowerCase();
      if (label.includes('followers')) markInteractive(node, 'followers', '', username);
      if (label.includes('following')) markInteractive(node, 'following', '', username);
    });
  }

  function decorateStats() {
    if (decorating) return;
    decorating = true;
    try {
      decorateOwnProfileStats();
      decorateWriterStats();
    } finally {
      decorating = false;
    }
  }

  async function resolveProfileId(node) {
    if (node.dataset.connectionProfileId) return node.dataset.connectionProfileId;
    const username = node.dataset.connectionUsername;
    if (!username) return null;
    const { data, error } = await db.from('profiles').select('id').ilike('username', username).maybeSingle();
    if (error || !data) return null;
    return data.id;
  }

  async function openConnections(node) {
    injectDialog();
    const kind = node.dataset.connectionKind;
    if (!['followers', 'following'].includes(kind)) return;
    const profileId = await resolveProfileId(node);
    if (!profileId) return;

    const dialog = $('connectionsDialogLaunch');
    const list = $('connectionsListLaunch');
    $('connectionsTitleLaunch').textContent = kind === 'followers' ? 'Followers' : 'Following';
    $('connectionsEyebrowLaunch').textContent = kind === 'followers' ? 'People who follow this writer' : 'Writers they follow';
    list.innerHTML = '<div class="connections-loading-launch">Loading writers…</div>';
    if (!dialog.open) dialog.showModal();

    const idColumn = kind === 'followers' ? 'follower_id' : 'following_id';
    const filterColumn = kind === 'followers' ? 'following_id' : 'follower_id';
    const { data: links, error: linksError } = await db.from('follows')
      .select(`${idColumn},created_at`)
      .eq(filterColumn, profileId)
      .order('created_at', { ascending: false });

    if (linksError) {
      console.error('Could not load connections', linksError);
      list.innerHTML = '<div class="connections-empty-launch">Could not load this list right now.</div>';
      return;
    }

    const ids = (links || []).map(link => link[idColumn]).filter(Boolean);
    if (!ids.length) {
      list.innerHTML = `<div class="connections-empty-launch">No ${kind} yet.</div>`;
      return;
    }

    const { data: profiles, error: profilesError } = await db.from('profiles')
      .select('id,username,display_name,avatar_url,tagline')
      .in('id', ids);

    if (profilesError) {
      console.error('Could not load connection profiles', profilesError);
      list.innerHTML = '<div class="connections-empty-launch">Could not load these profiles right now.</div>';
      return;
    }

    const profileMap = new Map((profiles || []).map(profile => [profile.id, profile]));
    list.replaceChildren();

    ids.forEach(id => {
      const profile = profileMap.get(id);
      if (!profile?.username) return;
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'connection-row-launch';

      const avatar = document.createElement('div');
      avatar.className = 'connection-avatar-launch';
      if (profile.avatar_url) avatar.style.backgroundImage = `url("${profile.avatar_url.replace(/"/g, '')}")`;
      else avatar.textContent = initials(profile.display_name || profile.username);

      const copy = document.createElement('div');
      copy.className = 'connection-copy-launch';
      const name = document.createElement('strong');
      name.textContent = profile.display_name || profile.username;
      const username = document.createElement('span');
      username.textContent = `@${profile.username}`;
      copy.append(name, username);
      if (profile.tagline) {
        const tagline = document.createElement('small');
        tagline.textContent = profile.tagline;
        copy.append(tagline);
      }

      const action = document.createElement('span');
      action.className = 'connection-open-launch';
      action.textContent = 'View profile →';

      row.append(avatar, copy, action);
      row.addEventListener('click', () => {
        dialog.close();
        location.href = `${location.pathname}?writer=${encodeURIComponent(profile.username)}#writer`;
      });
      list.append(row);
    });

    if (!list.children.length) {
      list.innerHTML = '<div class="connections-empty-launch">No public profiles to show.</div>';
    }
  }

  function routeConnectionActivation(event) {
    const node = event.target.closest('[data-connection-kind]');
    if (!node) return;
    if (event.type === 'keydown' && !['Enter', ' '].includes(event.key)) return;
    if (event.type === 'keydown') event.preventDefault();
    openConnections(node);
  }

  async function boot() {
    if (!window.supabase) return;
    injectStyles();
    injectDialog();
    await refreshUser();
    decorateStats();

    const ownStats = $('profileStats');
    if (ownStats) new MutationObserver(decorateStats).observe(ownStats, { childList: true, subtree: true });

    const writerView = $('writerViewLaunch');
    if (writerView) new MutationObserver(decorateStats).observe(writerView, { childList: true, subtree: true });

    document.addEventListener('click', routeConnectionActivation);
    document.addEventListener('keydown', routeConnectionActivation);
    window.addEventListener('popstate', () => setTimeout(decorateStats, 50));
    db.auth.onAuthStateChange(async (_event, session) => {
      currentUser = session?.user || null;
      setTimeout(decorateStats, 0);
    });

    setTimeout(decorateStats, 900);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();