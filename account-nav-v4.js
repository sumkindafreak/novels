/* Novels Community — account/profile/settings navigation */
(() => {
  'use strict';

  const SUPABASE_URL = 'https://efftrxqdsrmyuaubjumh.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_C2qPiCHALCK9bvhFc8CpvA_Vc6tTGYo';
  const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });

  const $ = (id) => document.getElementById(id);
  const state = { user: null, profile: null, injected: false };

  function toast(message) {
    const node = $('toast');
    if (!node) return;
    node.textContent = message;
    node.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => node.classList.remove('show'), 3000);
  }

  function initials(value) {
    return String(value || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase() || 'N';
  }

  function styles() {
    if ($('accountNavV4Styles')) return;
    const style = document.createElement('style');
    style.id = 'accountNavV4Styles';
    style.textContent = `
      .account-chip-v4{display:flex;align-items:center;gap:9px;border:1px solid var(--line,rgba(255,255,255,.12));background:rgba(255,255,255,.045);color:var(--text,#fff);padding:6px 10px 6px 6px;border-radius:999px;min-height:42px}
      .account-avatar-v4{width:30px;height:30px;border-radius:50%;background:#2a3040;background-size:cover;background-position:center;display:grid;place-items:center;font-size:11px;font-weight:800;flex:0 0 auto}
      .account-name-v4{max-width:130px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:700;font-size:13px}.account-caret-v4{opacity:.55;font-size:11px}
      .account-menu-v4{position:fixed;right:22px;top:74px;width:min(310px,calc(100vw - 24px));z-index:180;background:#151923;border:1px solid #343b4e;border-radius:18px;box-shadow:0 26px 90px rgba(0,0,0,.5);padding:10px}
      .account-menu-head-v4{padding:11px 12px 12px;border-bottom:1px solid rgba(255,255,255,.08);margin-bottom:6px}.account-menu-head-v4 strong{display:block}.account-menu-head-v4 small{display:block;color:var(--muted,#9aa3b2);margin-top:3px;overflow:hidden;text-overflow:ellipsis}
      .account-menu-v4 button{width:100%;border:0;background:transparent;color:inherit;text-align:left;padding:11px 12px;border-radius:10px;display:flex;align-items:center;gap:10px}.account-menu-v4 button:hover{background:rgba(255,255,255,.06)}.account-menu-v4 .danger-v4{color:#ff9b9b}.account-menu-sep-v4{height:1px;background:rgba(255,255,255,.08);margin:6px}
      .mobile-nav-v4{display:none}
      .settings-sheet-v4{border:1px solid #343b4e;border-radius:20px;background:#151923;color:#eef2f7;padding:0;max-width:min(680px,94vw);width:100%}.settings-sheet-v4::backdrop{background:rgba(0,0,0,.72)}.settings-inner-v4{padding:22px}.settings-account-v4{display:grid;grid-template-columns:58px 1fr;gap:14px;align-items:center;padding:14px;border:1px solid rgba(255,255,255,.09);border-radius:14px;background:rgba(255,255,255,.025);margin-bottom:16px}.settings-avatar-v4{width:58px;height:58px;border-radius:50%;background:#2a3040;background-size:cover;background-position:center;display:grid;place-items:center;font-weight:800}.settings-account-v4 small{display:block;color:var(--muted,#9aa3b2);margin-top:3px}.settings-shortcuts-v4{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.settings-note-v4{color:var(--muted,#9aa3b2);font-size:.88rem;line-height:1.5;margin-top:14px}
      .auth-legacy-signed-in-v4{display:none!important}
      @media(max-width:820px){
        body{padding-bottom:76px}
        .site-header{gap:10px}.header-actions{gap:6px}.account-chip-v4{padding:5px;border-radius:50%;width:42px;height:42px;justify-content:center}.account-name-v4,.account-caret-v4{display:none}.account-menu-v4{right:10px;top:66px}
        .mobile-nav-v4{position:fixed;left:8px;right:8px;bottom:8px;z-index:170;display:grid;grid-template-columns:repeat(5,1fr);gap:4px;background:rgba(16,20,29,.96);backdrop-filter:blur(18px);border:1px solid rgba(255,255,255,.12);box-shadow:0 16px 50px rgba(0,0,0,.45);border-radius:18px;padding:6px calc(6px + env(safe-area-inset-right)) calc(6px + env(safe-area-inset-bottom)) calc(6px + env(safe-area-inset-left))}
        .mobile-nav-v4 button{border:0;background:transparent;color:var(--muted,#9aa3b2);border-radius:12px;padding:7px 2px 5px;display:grid;place-items:center;gap:2px;font-size:10px;min-width:0}.mobile-nav-v4 button .icon-v4{font-size:18px;line-height:1}.mobile-nav-v4 button.active,.mobile-nav-v4 button:hover{color:var(--text,#fff);background:rgba(255,255,255,.06)}
        .notify-drawer-launch{bottom:86px;top:auto;right:10px;max-height:68vh}
      }
      @media(max-width:520px){.settings-shortcuts-v4{grid-template-columns:1fr}.settings-inner-v4{padding:17px}}
    `;
    document.head.append(style);
  }

  function navButton(id, icon, label) {
    return `<button id="${id}" type="button"><span class="icon-v4" aria-hidden="true">${icon}</span><span>${label}</span></button>`;
  }

  function inject() {
    if (state.injected) return;
    const headerActions = document.querySelector('.header-actions');
    if (!headerActions || !$('authButton')) return;
    styles();

    if (!$('accountChipV4')) {
      const chip = document.createElement('button');
      chip.id = 'accountChipV4';
      chip.type = 'button';
      chip.className = 'account-chip-v4 hidden';
      chip.setAttribute('aria-haspopup', 'menu');
      chip.setAttribute('aria-expanded', 'false');
      chip.innerHTML = '<span id="accountAvatarV4" class="account-avatar-v4">N</span><span id="accountNameV4" class="account-name-v4">Account</span><span class="account-caret-v4">▾</span>';
      chip.onclick = toggleMenu;
      headerActions.insertBefore(chip, $('authButton'));
    }

    if (!$('accountMenuV4')) {
      const menu = document.createElement('div');
      menu.id = 'accountMenuV4';
      menu.className = 'account-menu-v4 hidden';
      menu.setAttribute('role', 'menu');
      menu.innerHTML = `
        <div class="account-menu-head-v4"><strong id="accountMenuNameV4">Your account</strong><small id="accountMenuUserV4"></small></div>
        <button id="publicProfileV4" type="button">👤 <span>View public profile</span></button>
        <button id="editProfileV4" type="button">✏️ <span>Edit profile</span></button>
        <button id="writerStudioV4" type="button">📝 <span>Writer studio</span></button>
        <button id="notificationsV4" type="button">🔔 <span>Notifications</span></button>
        <button id="settingsV4" type="button">⚙️ <span>Settings & security</span></button>
        <div class="account-menu-sep-v4"></div>
        <button id="signOutV4" class="danger-v4" type="button">↪ <span>Sign out</span></button>`;
      document.body.append(menu);
      $('publicProfileV4').onclick = openPublicProfile;
      $('editProfileV4').onclick = () => { closeMenu(); goView('profile'); };
      $('writerStudioV4').onclick = () => { closeMenu(); goView('write'); };
      $('notificationsV4').onclick = () => { closeMenu(); openNotifications(); };
      $('settingsV4').onclick = () => { closeMenu(); openSettings(); };
      $('signOutV4').onclick = signOut;
    }

    if (!$('mobileNavV4')) {
      const nav = document.createElement('nav');
      nav.id = 'mobileNavV4';
      nav.className = 'mobile-nav-v4';
      nav.setAttribute('aria-label', 'Mobile navigation');
      nav.innerHTML = [
        navButton('mobileHomeV4', '⌂', 'Home'),
        navButton('mobileWriteV4', '✎', 'Write'),
        navButton('mobileAlertsV4', '🔔', 'Alerts'),
        navButton('mobileProfileV4', '👤', 'Profile'),
        navButton('mobileSettingsV4', '⚙', 'Settings'),
      ].join('');
      document.body.append(nav);
      $('mobileHomeV4').onclick = () => goView('discover');
      $('mobileWriteV4').onclick = () => goView('write');
      $('mobileAlertsV4').onclick = () => state.user ? openNotifications() : requestSignIn();
      $('mobileProfileV4').onclick = () => goView('profile');
      $('mobileSettingsV4').onclick = () => state.user ? openSettings() : requestSignIn();
    }

    if (!$('settingsSheetV4')) {
      const dialog = document.createElement('dialog');
      dialog.id = 'settingsSheetV4';
      dialog.className = 'settings-sheet-v4';
      dialog.innerHTML = `
        <div class="settings-inner-v4">
          <div class="panel-heading"><div><span class="eyebrow">Account</span><h2>Settings & security</h2></div><button id="closeSettingsV4" class="button ghost" type="button">Close</button></div>
          <div class="settings-account-v4"><div id="settingsAvatarV4" class="settings-avatar-v4">N</div><div><strong id="settingsNameV4">Writer</strong><small id="settingsUserV4"></small><small id="settingsEmailV4"></small></div></div>
          <div class="settings-shortcuts-v4">
            <button id="settingsEditProfileV4" class="button secondary" type="button">Edit profile</button>
            <button id="settingsPublicProfileV4" class="button secondary" type="button">Public profile</button>
            <button id="settingsWriterV4" class="button secondary" type="button">Writer studio</button>
            <button id="settingsSecurityV4" class="button secondary" type="button">Password & security</button>
            <button id="settingsNotificationsV4" class="button secondary" type="button">Notifications</button>
            <button id="settingsSignOutV4" class="button ghost" type="button">Sign out</button>
          </div>
          <p class="settings-note-v4">Reader font size and Light / Sepia / Dark controls are available directly above the story while you read. Password reset and change controls live in the security panel on your Profile page.</p>
        </div>`;
      document.body.append(dialog);
      $('closeSettingsV4').onclick = () => dialog.close();
      $('settingsEditProfileV4').onclick = () => { dialog.close(); goView('profile'); };
      $('settingsPublicProfileV4').onclick = () => { dialog.close(); openPublicProfile(); };
      $('settingsWriterV4').onclick = () => { dialog.close(); goView('write'); };
      $('settingsSecurityV4').onclick = () => { dialog.close(); goSettingsSection(); };
      $('settingsNotificationsV4').onclick = () => { dialog.close(); openNotifications(); };
      $('settingsSignOutV4').onclick = async () => { dialog.close(); await signOut(); };
    }

    document.addEventListener('click', (event) => {
      const menu = $('accountMenuV4');
      const chip = $('accountChipV4');
      if (!menu || menu.classList.contains('hidden')) return;
      if (!menu.contains(event.target) && !chip.contains(event.target)) closeMenu();
    });
    window.addEventListener('hashchange', updateMobileActive);
    window.addEventListener('popstate', updateMobileActive);
    db.auth.onAuthStateChange(async (_event, session) => {
      state.user = session?.user || null;
      await loadIdentity();
    });
    state.injected = true;
  }

  function requestSignIn() {
    const auth = $('authButton');
    if (auth) auth.click();
  }

  function goView(name) {
    closeMenu();
    const source = document.querySelector(`.main-nav [data-view="${name}"]`) || document.querySelector(`[data-view="${name}"]`);
    if (source) source.click();
    else location.hash = name;
    setTimeout(updateMobileActive, 30);
  }

  function goSettingsSection() {
    goView('profile');
    setTimeout(() => {
      const security = $('securityLaunch');
      if (security) security.scrollIntoView({ behavior: 'smooth', block: 'start' });
      else toast('Open Profile to manage your account security.');
    }, 220);
  }

  function openNotifications() {
    const button = $('notifyLaunch');
    if (button && !button.classList.contains('hidden')) button.click();
    else toast('Notifications are available after signing in.');
  }

  function openPublicProfile() {
    closeMenu();
    const username = state.profile?.username;
    if (!username) return toast('Your public profile is still loading.');
    location.href = `${location.pathname}?writer=${encodeURIComponent(username)}#writer`;
  }

  async function signOut() {
    closeMenu();
    const { error } = await db.auth.signOut();
    if (error) return toast(error.message || 'Could not sign out.');
    state.user = null;
    state.profile = null;
    await loadIdentity();
    goView('discover');
    toast('Signed out.');
  }

  function toggleMenu() {
    if (!state.user) return requestSignIn();
    const menu = $('accountMenuV4');
    const chip = $('accountChipV4');
    const opening = menu.classList.contains('hidden');
    menu.classList.toggle('hidden', !opening);
    chip.setAttribute('aria-expanded', opening ? 'true' : 'false');
  }

  function closeMenu() {
    $('accountMenuV4')?.classList.add('hidden');
    $('accountChipV4')?.setAttribute('aria-expanded', 'false');
  }

  function setAvatar(node, profile) {
    if (!node) return;
    const image = profile?.avatar_url;
    node.style.backgroundImage = image ? `url("${image.replace(/"/g, '')}")` : '';
    node.textContent = image ? '' : initials(profile?.display_name || profile?.username || 'N');
  }

  async function loadIdentity() {
    const { data: { session } } = await db.auth.getSession();
    state.user = session?.user || null;
    const authButton = $('authButton');
    if (!state.user) {
      state.profile = null;
      $('accountChipV4')?.classList.add('hidden');
      authButton?.classList.remove('auth-legacy-signed-in-v4');
      closeMenu();
      updateMobileActive();
      return;
    }

    const { data } = await db.from('profiles').select('*').eq('id', state.user.id).maybeSingle();
    state.profile = data || null;
    $('accountChipV4')?.classList.remove('hidden');
    authButton?.classList.add('auth-legacy-signed-in-v4');

    const display = state.profile?.display_name || state.profile?.username || 'Account';
    $('accountNameV4').textContent = display;
    $('accountMenuNameV4').textContent = display;
    $('accountMenuUserV4').textContent = `${state.profile?.username ? '@' + state.profile.username + ' · ' : ''}${state.user.email || ''}`;
    $('settingsNameV4').textContent = display;
    $('settingsUserV4').textContent = state.profile?.username ? `@${state.profile.username}` : '';
    $('settingsEmailV4').textContent = state.user.email || '';
    setAvatar($('accountAvatarV4'), state.profile);
    setAvatar($('settingsAvatarV4'), state.profile);
    updateMobileActive();
  }

  function openSettings() {
    if (!state.user) return requestSignIn();
    closeMenu();
    loadIdentity().finally(() => {
      const dialog = $('settingsSheetV4');
      if (dialog && !dialog.open) dialog.showModal();
    });
  }

  function updateMobileActive() {
    const hash = location.hash.replace('#', '');
    const mapping = {
      discover: 'mobileHomeV4',
      write: 'mobileWriteV4',
      profile: 'mobileProfileV4',
      writer: 'mobileProfileV4',
    };
    document.querySelectorAll('#mobileNavV4 button').forEach(button => button.classList.remove('active'));
    const id = mapping[hash] || 'mobileHomeV4';
    $(id)?.classList.add('active');
  }

  async function boot() {
    inject();
    if (!state.injected) {
      setTimeout(boot, 80);
      return;
    }
    await loadIdentity();
    updateMobileActive();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();