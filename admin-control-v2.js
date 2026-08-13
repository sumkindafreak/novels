/* WriteLite — owner/admin control centre v2 */
(() => {
  'use strict';

  const SUPABASE_URL = 'https://efftrxqdsrmyuaubjumh.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_C2qPiCHALCK9bvhFc8CpvA_Vc6tTGYo';
  const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });

  const state = {
    user: null,
    profile: null,
    isAdmin: false,
    tab: 'overview',
    query: '',
    filter: '',
    loading: false,
  };

  const $ = (id) => document.getElementById(id);
  const formatDateTime = (value) => value ? new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }).format(new Date(value)) : '—';
  const formatNumber = (value) => new Intl.NumberFormat('en-GB').format(Number(value) || 0);

  function toast(message) {
    const n = $('toast');
    if (!n) return;
    n.textContent = message;
    n.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => n.classList.remove('show'), 3200);
  }

  function node(tag, className, text) {
    const n = document.createElement(tag);
    if (className) n.className = className;
    if (text !== undefined && text !== null) n.textContent = String(text);
    return n;
  }

  function button(label, handler, className = 'button ghost') {
    const b = node('button', className, label);
    b.type = 'button';
    b.addEventListener('click', handler);
    return b;
  }

  function statusPill(value) {
    const safe = String(value || 'unknown');
    return node('span', `admin-status-v2 status-${safe.replace(/[^a-z0-9_-]/gi, '-').toLowerCase()}`, safe);
  }

  async function rpc(name, args = {}) {
    const { data, error } = await db.rpc(name, args);
    if (error) throw error;
    return data;
  }

  function styles() {
    if ($('adminControlV2Styles')) return;
    const style = document.createElement('style');
    style.id = 'adminControlV2Styles';
    style.textContent = `
      .admin-control-v2{width:min(1220px,96vw);max-width:1220px;height:min(860px,92vh);max-height:92vh;padding:0;border:1px solid #343b4e;border-radius:22px;background:#111620;color:#eef2f7;box-shadow:0 30px 110px rgba(0,0,0,.6)}
      .admin-control-v2::backdrop{background:rgba(0,0,0,.78);backdrop-filter:blur(3px)}
      .admin-shell-v2{height:100%;display:grid;grid-template-columns:220px minmax(0,1fr);overflow:hidden}
      .admin-sidebar-v2{padding:22px 14px;background:#0d1119;border-right:1px solid rgba(255,255,255,.08);display:flex;flex-direction:column;gap:14px;min-width:0}
      .admin-brand-v2{padding:4px 8px 12px}.admin-brand-v2 strong{display:block;font-family:var(--serif,Georgia,serif);font-size:24px}.admin-brand-v2 small{display:block;color:var(--muted,#969eb0);margin-top:4px}
      .admin-tabs-v2{display:grid;gap:6px}.admin-tab-v2{border:0;background:transparent;color:var(--muted,#969eb0);padding:11px 12px;text-align:left;border-radius:11px;font-weight:700}.admin-tab-v2:hover,.admin-tab-v2.active{background:rgba(255,255,255,.07);color:var(--text,#f2f3f7)}
      .admin-sidebar-foot-v2{margin-top:auto;color:var(--muted,#969eb0);font-size:12px;line-height:1.45;padding:8px}
      .admin-main-v2{display:grid;grid-template-rows:auto auto minmax(0,1fr);min-width:0;min-height:0}
      .admin-head-v2{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:20px 22px 12px}.admin-head-v2 h2{margin:0;font-family:var(--serif,Georgia,serif);font-size:31px;font-weight:500}.admin-head-actions-v2{display:flex;gap:8px;flex-wrap:wrap}
      .admin-toolbar-v2{display:flex;gap:10px;align-items:center;padding:0 22px 16px;border-bottom:1px solid rgba(255,255,255,.08)}.admin-toolbar-v2 input{flex:1}.admin-toolbar-v2 select{width:190px}.admin-toolbar-v2.hidden{display:none}
      .admin-content-v2{overflow:auto;padding:20px 22px 28px;min-height:0}
      .admin-loading-v2{padding:48px;text-align:center;color:var(--muted,#969eb0)}
      .admin-stats-v2{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:11px;margin-bottom:22px}.admin-stat-v2{padding:16px;border:1px solid rgba(255,255,255,.1);background:#161c28;border-radius:15px;min-width:0}.admin-stat-v2 strong{display:block;font-family:var(--serif,Georgia,serif);font-size:34px;font-weight:500;line-height:1;color:var(--accent-2,#f1c986)}.admin-stat-v2 span{display:block;margin-top:7px;color:var(--muted,#969eb0);font-size:11px;text-transform:uppercase;letter-spacing:.8px}
      .admin-section-title-v2{display:flex;justify-content:space-between;gap:12px;align-items:center;margin:22px 0 10px}.admin-section-title-v2 h3{margin:0;font-family:var(--serif,Georgia,serif);font-size:24px;font-weight:500}
      .admin-list-v2{display:grid;gap:10px}.admin-card-v2{padding:15px;border:1px solid rgba(255,255,255,.1);background:#151b27;border-radius:14px}.admin-card-head-v2{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.admin-card-head-v2 h4{margin:0 0 4px;font-size:16px}.admin-card-meta-v2{color:var(--muted,#969eb0);font-size:12px;line-height:1.45}.admin-card-body-v2{margin-top:10px;color:#c7ccd7;line-height:1.55;white-space:pre-wrap;word-break:break-word}.admin-actions-v2{display:flex;gap:7px;flex-wrap:wrap;margin-top:13px}.admin-actions-v2 .button{padding:7px 10px;font-size:12px}.admin-danger-v2{border-color:rgba(255,119,119,.35)!important;color:#ff9b9b!important}.admin-good-v2{border-color:rgba(123,216,164,.35)!important;color:#9ce7bc!important}.admin-warning-v2{border-color:rgba(241,201,134,.35)!important;color:#f1c986!important}
      .admin-status-v2{display:inline-flex;align-items:center;padding:4px 8px;border-radius:999px;border:1px solid rgba(255,255,255,.12);font-size:10px;text-transform:uppercase;letter-spacing:.7px;color:#cbd1dc;white-space:nowrap}.status-open,.status-held,.status-hidden,.status-restricted{color:#f1c986}.status-actioned,.status-clear,.status-visible,.status-active,.status-published{color:#9ce7bc}.status-removed,.status-suspended{color:#ff9b9b}.status-dismissed,.status-reviewed,.status-draft{color:#b9c0cf}
      .admin-note-v2{padding:12px 13px;border-radius:12px;background:rgba(241,201,134,.06);border:1px solid rgba(241,201,134,.16);color:#d9d2c4;font-size:12px;line-height:1.5;margin-top:10px}
      .admin-empty-v2{padding:38px;text-align:center;border:1px dashed rgba(255,255,255,.14);border-radius:14px;color:var(--muted,#969eb0)}
      .admin-audit-v2{display:grid;gap:8px}.admin-audit-row-v2{display:grid;grid-template-columns:145px 110px 1fr;gap:12px;padding:11px 13px;border-bottom:1px solid rgba(255,255,255,.07);font-size:12px}.admin-audit-row-v2 strong{color:#e7eaf0}.admin-audit-row-v2 span{color:var(--muted,#969eb0)}
      @media(max-width:900px){.admin-shell-v2{grid-template-columns:1fr;grid-template-rows:auto minmax(0,1fr)}.admin-sidebar-v2{padding:10px;border-right:0;border-bottom:1px solid rgba(255,255,255,.08);display:block}.admin-brand-v2{display:none}.admin-tabs-v2{display:flex;overflow:auto;gap:5px}.admin-tab-v2{white-space:nowrap;padding:9px 10px}.admin-sidebar-foot-v2{display:none}.admin-stats-v2{grid-template-columns:repeat(2,minmax(0,1fr))}.admin-head-v2{padding:14px 14px 10px}.admin-toolbar-v2{padding:0 14px 12px}.admin-content-v2{padding:14px}.admin-audit-row-v2{grid-template-columns:1fr;gap:4px}}
      @media(max-width:560px){.admin-control-v2{width:100vw;height:100vh;max-height:100vh;border-radius:0;border:0}.admin-toolbar-v2{align-items:stretch;flex-direction:column}.admin-toolbar-v2 select{width:100%}.admin-stats-v2{grid-template-columns:1fr 1fr}.admin-head-actions-v2 .button{padding:8px 10px}.admin-card-head-v2{display:grid}.admin-actions-v2 .button{flex:1 1 auto}}
    `;
    document.head.append(style);
  }

  function inject() {
    if ($('adminControlV2')) return;
    styles();

    const dialog = document.createElement('dialog');
    dialog.id = 'adminControlV2';
    dialog.className = 'admin-control-v2';
    dialog.innerHTML = `
      <div class="admin-shell-v2">
        <aside class="admin-sidebar-v2">
          <div class="admin-brand-v2"><strong>WriteLite Admin</strong><small>Owner control centre</small></div>
          <nav class="admin-tabs-v2" aria-label="Admin sections">
            <button class="admin-tab-v2 active" type="button" data-admin-tab-v2="overview">Overview</button>
            <button class="admin-tab-v2" type="button" data-admin-tab-v2="reports">Reports</button>
            <button class="admin-tab-v2" type="button" data-admin-tab-v2="stories">Stories</button>
            <button class="admin-tab-v2" type="button" data-admin-tab-v2="comments">Comments</button>
            <button class="admin-tab-v2" type="button" data-admin-tab-v2="users">Users</button>
            <button class="admin-tab-v2" type="button" data-admin-tab-v2="audit">Audit trail</button>
          </nav>
          <div class="admin-sidebar-foot-v2">Moderation changes are applied server-side and logged in the audit trail.</div>
        </aside>
        <section class="admin-main-v2">
          <header class="admin-head-v2">
            <div><span class="eyebrow">Admin only</span><h2 id="adminTitleV2">Overview</h2></div>
            <div class="admin-head-actions-v2">
              <button id="adminRefreshV2" class="button ghost" type="button">Refresh</button>
              <button id="adminCloseV2" class="button ghost" type="button">Close</button>
            </div>
          </header>
          <div id="adminToolbarV2" class="admin-toolbar-v2 hidden">
            <input id="adminSearchV2" type="search" placeholder="Search…" autocomplete="off" />
            <select id="adminFilterV2" aria-label="Admin filter"></select>
          </div>
          <div id="adminContentV2" class="admin-content-v2"></div>
        </section>
      </div>`;
    document.body.append(dialog);

    $('adminCloseV2').onclick = () => dialog.close();
    $('adminRefreshV2').onclick = () => refreshCurrent();
    document.querySelectorAll('[data-admin-tab-v2]').forEach((tab) => {
      tab.addEventListener('click', () => setTab(tab.dataset.adminTabV2));
    });

    let timer = null;
    $('adminSearchV2').addEventListener('input', (event) => {
      state.query = event.target.value.trim();
      clearTimeout(timer);
      timer = setTimeout(() => loadCurrentTab(), 250);
    });
    $('adminFilterV2').addEventListener('change', (event) => {
      state.filter = event.target.value;
      loadCurrentTab();
    });
  }

  function hijackLegacyButton() {
    const legacy = $('adminLaunchButton');
    if (!legacy) return;
    if (legacy.textContent !== 'Open admin control centre') legacy.textContent = 'Open admin control centre';
    legacy.onclick = openAdminControl;
    legacy.classList.toggle('hidden', !state.isAdmin);
  }

  async function refreshIdentity() {
    const { data: { session } } = await db.auth.getSession();
    state.user = session?.user || null;
    state.profile = null;
    state.isAdmin = false;

    if (state.user) {
      const { data, error } = await db.from('profiles').select('id,username,display_name,is_admin').eq('id', state.user.id).maybeSingle();
      if (!error && data) {
        state.profile = data;
        state.isAdmin = data.is_admin === true;
      }
    }
    hijackLegacyButton();
  }

  async function openAdminControl() {
    await refreshIdentity();
    if (!state.isAdmin) return toast('Admin access required.');
    inject();
    hijackLegacyButton();
    const dialog = $('adminControlV2');
    if (!dialog.open) dialog.showModal();
    await setTab('overview');
  }

  function configureToolbar() {
    const toolbar = $('adminToolbarV2');
    const search = $('adminSearchV2');
    const filter = $('adminFilterV2');
    if (!toolbar || !search || !filter) return;

    const configs = {
      reports: { placeholder: 'Search reports, reason or reporter…', options: [['', 'All statuses'], ['open', 'Open'], ['reviewed', 'Reviewed'], ['dismissed', 'Dismissed'], ['actioned', 'Actioned']] },
      stories: { placeholder: 'Search title or writer…', options: [['', 'All moderation states'], ['clear', 'Clear'], ['held', 'Held'], ['removed', 'Removed']] },
      comments: { placeholder: 'Search comment, story or writer…', options: [['', 'All moderation states'], ['visible', 'Visible'], ['hidden', 'Hidden'], ['removed', 'Removed']] },
      users: { placeholder: 'Search username or display name…', options: [['', 'All account states'], ['active', 'Active'], ['restricted', 'Restricted'], ['suspended', 'Suspended']] },
    };
    const cfg = configs[state.tab];
    toolbar.classList.toggle('hidden', !cfg);
    if (!cfg) return;
    search.placeholder = cfg.placeholder;
    search.value = state.query;
    filter.replaceChildren();
    cfg.options.forEach(([value, label]) => {
      const option = node('option', '', label);
      option.value = value;
      filter.append(option);
    });
    filter.value = state.filter;
  }

  async function setTab(tab) {
    state.tab = tab;
    state.query = '';
    state.filter = '';
    document.querySelectorAll('[data-admin-tab-v2]').forEach((b) => b.classList.toggle('active', b.dataset.adminTabV2 === tab));
    const titles = { overview: 'Overview', reports: 'Reports', stories: 'Stories', comments: 'Comments', users: 'Users', audit: 'Audit trail' };
    $('adminTitleV2').textContent = titles[tab] || 'Admin';
    configureToolbar();
    await loadCurrentTab();
  }

  function showLoading() {
    const content = $('adminContentV2');
    if (content) content.replaceChildren(node('div', 'admin-loading-v2', 'Loading admin data…'));
  }

  function showError(error) {
    const content = $('adminContentV2');
    if (!content) return;
    const card = node('div', 'admin-empty-v2');
    card.append(node('strong', '', 'Admin data could not be loaded.'), node('div', 'admin-card-meta-v2', error?.message || String(error)));
    content.replaceChildren(card);
  }

  async function loadCurrentTab() {
    if (!state.isAdmin || state.loading) return;
    state.loading = true;
    showLoading();
    try {
      if (state.tab === 'overview') await renderOverview();
      else if (state.tab === 'reports') await renderReports();
      else if (state.tab === 'stories') await renderStories();
      else if (state.tab === 'comments') await renderComments();
      else if (state.tab === 'users') await renderUsers();
      else if (state.tab === 'audit') await renderAudit();
    } catch (error) {
      console.error('WriteLite admin panel error:', error);
      showError(error);
    } finally {
      state.loading = false;
    }
  }

  async function refreshCurrent() {
    state.loading = false;
    await loadCurrentTab();
  }

  function statCard(value, label, clickTab) {
    const card = node('div', 'admin-stat-v2');
    card.append(node('strong', '', formatNumber(value)), node('span', '', label));
    if (clickTab) {
      card.style.cursor = 'pointer';
      card.tabIndex = 0;
      card.onclick = () => setTab(clickTab);
      card.onkeydown = (event) => { if (event.key === 'Enter' || event.key === ' ') setTab(clickTab); };
    }
    return card;
  }

  async function renderOverview() {
    const [stats, reports] = await Promise.all([
      rpc('admin_dashboard_v2'),
      rpc('admin_list_reports_v2', { p_status: 'open', p_query: '', p_limit: 6 }),
    ]);
    const content = $('adminContentV2');
    content.replaceChildren();

    const grid = node('div', 'admin-stats-v2');
    grid.append(
      statCard(stats.reports_open, 'Open reports', 'reports'),
      statCard(stats.users_total, 'Users', 'users'),
      statCard(stats.stories_published, 'Published stories', 'stories'),
      statCard(stats.comments_total, 'Comments', 'comments'),
      statCard(stats.actions_7d, 'Actions · 7 days', 'audit'),
      statCard(stats.users_restricted, 'Restricted users', 'users'),
      statCard(stats.users_suspended, 'Suspended users', 'users'),
      statCard(stats.stories_held, 'Held / removed stories', 'stories'),
      statCard(stats.comments_hidden, 'Hidden comments', 'comments'),
      statCard(stats.reports_total, 'Reports all time', 'reports')
    );
    content.append(grid);

    const heading = node('div', 'admin-section-title-v2');
    heading.append(node('h3', '', 'Open reports'), button('View all reports', () => setTab('reports')));
    content.append(heading);

    const list = node('div', 'admin-list-v2');
    if (!reports.length) list.append(node('div', 'admin-empty-v2', 'No open reports.'));
    reports.forEach((report) => list.append(reportCard(report, true)));
    content.append(list);
  }

  async function renderReports() {
    const reports = await rpc('admin_list_reports_v2', { p_status: state.filter || null, p_query: state.query || null, p_limit: 150 });
    const content = $('adminContentV2');
    content.replaceChildren();
    const list = node('div', 'admin-list-v2');
    if (!reports.length) list.append(node('div', 'admin-empty-v2', 'No reports match this filter.'));
    reports.forEach((report) => list.append(reportCard(report, false)));
    content.append(list);
  }

  function reportCard(report, compact) {
    const card = node('article', 'admin-card-v2');
    const head = node('div', 'admin-card-head-v2');
    const titleWrap = node('div');
    titleWrap.append(node('h4', '', `${report.target_type || 'content'} · ${report.reason || 'Report'}`));
    titleWrap.append(node('div', 'admin-card-meta-v2', `${formatDateTime(report.created_at)} · reporter: ${report.reporter?.display_name || report.reporter?.username || 'Unknown'}`));
    head.append(titleWrap, statusPill(report.status));
    card.append(head);

    const target = report.target;
    if (target?.label) {
      const targetText = target.label.length > 240 ? `${target.label.slice(0, 240)}…` : target.label;
      card.append(node('div', 'admin-note-v2', `Target: ${targetText}`));
    }
    if (report.details && !compact) card.append(node('div', 'admin-card-body-v2', report.details));

    const actions = node('div', 'admin-actions-v2');
    if (target?.slug || target?.story_slug) actions.append(button('Open content', () => openStory(target.slug || target.story_slug)));
    if (report.target_type === 'profile' && target?.username) actions.append(button('Open profile', () => openWriter(target.username)));

    ['reviewed', 'dismissed', 'actioned'].forEach((status) => {
      if (report.status === status) return;
      actions.append(button(status[0].toUpperCase() + status.slice(1), () => changeReportStatus(report, status), status === 'actioned' ? 'button ghost admin-good-v2' : 'button ghost'));
    });
    if (report.status !== 'open') actions.append(button('Reopen', () => changeReportStatus(report, 'open')));

    if (report.target_type === 'story' && report.target_id) {
      actions.append(button('Hold story', () => storyAction(report.target_id, 'hold', 'Hold this story from public view?'), 'button ghost admin-warning-v2'));
      actions.append(button('Remove story', () => storyAction(report.target_id, 'remove', 'Remove this story from public view?'), 'button ghost admin-danger-v2'));
    }
    if (report.target_type === 'comment' && report.target_id) {
      actions.append(button('Hide comment', () => commentAction(report.target_id, 'hide', 'Hide this comment?'), 'button ghost admin-warning-v2'));
      actions.append(button('Remove comment', () => commentAction(report.target_id, 'remove', 'Remove this comment?'), 'button ghost admin-danger-v2'));
    }
    if (report.target_type === 'profile' && report.target_id) {
      actions.append(button('Restrict user', () => userAction(report.target_id, 'restrict', null, 'Restrict this user from publishing and commenting?'), 'button ghost admin-warning-v2'));
      actions.append(button('Suspend user', () => userAction(report.target_id, 'suspend', null, 'Suspend this user indefinitely?'), 'button ghost admin-danger-v2'));
    }
    card.append(actions);
    return card;
  }

  async function renderStories() {
    const stories = await rpc('admin_list_stories_v2', { p_query: state.query || null, p_state: state.filter || null, p_limit: 150 });
    const content = $('adminContentV2');
    content.replaceChildren();
    const list = node('div', 'admin-list-v2');
    if (!stories.length) list.append(node('div', 'admin-empty-v2', 'No stories match this filter.'));
    stories.forEach((story) => {
      const card = node('article', 'admin-card-v2');
      const head = node('div', 'admin-card-head-v2');
      const title = node('div');
      title.append(node('h4', '', story.title), node('div', 'admin-card-meta-v2', `by ${story.display_name || story.username || 'Unknown'} · updated ${formatDateTime(story.updated_at)}`));
      const pills = node('div', 'admin-actions-v2');
      pills.style.marginTop = '0';
      pills.append(statusPill(story.status), statusPill(story.moderation_state));
      if (story.is_featured) pills.append(statusPill('featured'));
      head.append(title, pills);
      card.append(head);
      if (story.moderation_note) card.append(node('div', 'admin-note-v2', `Admin note: ${story.moderation_note}`));
      const actions = node('div', 'admin-actions-v2');
      actions.append(button('Open', () => openStory(story.slug)));
      if (story.username) actions.append(button('Writer', () => openWriter(story.username)));
      if (story.moderation_state !== 'held') actions.append(button('Hold', () => storyAction(story.id, 'hold', 'Hold this story from public view?'), 'button ghost admin-warning-v2'));
      if (story.moderation_state !== 'removed') actions.append(button('Remove', () => storyAction(story.id, 'remove', 'Remove this story from public view?'), 'button ghost admin-danger-v2'));
      if (story.moderation_state !== 'clear') actions.append(button('Restore', () => storyAction(story.id, 'restore', 'Restore this story to its normal moderation state?'), 'button ghost admin-good-v2'));
      if (story.status === 'published') actions.append(button('Unpublish', () => storyAction(story.id, 'unpublish', 'Move this story back to draft?')));
      else actions.append(button('Publish', () => storyAction(story.id, 'publish', 'Publish this story?'), 'button ghost admin-good-v2'));
      if (story.is_featured) actions.append(button('Unfeature', () => storyAction(story.id, 'unfeature', 'Remove this story from featured?')));
      else actions.append(button('Feature', () => storyAction(story.id, 'feature', 'Feature this story on WriteLite?'), 'button ghost admin-good-v2'));
      card.append(actions);
      list.append(card);
    });
    content.append(list);
  }

  async function renderComments() {
    const comments = await rpc('admin_list_comments_v2', { p_query: state.query || null, p_state: state.filter || null, p_limit: 150 });
    const content = $('adminContentV2');
    content.replaceChildren();
    const list = node('div', 'admin-list-v2');
    if (!comments.length) list.append(node('div', 'admin-empty-v2', 'No comments match this filter.'));
    comments.forEach((comment) => {
      const card = node('article', 'admin-card-v2');
      const head = node('div', 'admin-card-head-v2');
      const title = node('div');
      title.append(node('h4', '', comment.display_name || comment.username || 'Writer'), node('div', 'admin-card-meta-v2', `${comment.story_title || 'Unknown story'} · ${formatDateTime(comment.created_at)}`));
      head.append(title, statusPill(comment.moderation_state));
      card.append(head, node('div', 'admin-card-body-v2', comment.body));
      if (comment.moderation_note) card.append(node('div', 'admin-note-v2', `Admin note: ${comment.moderation_note}`));
      const actions = node('div', 'admin-actions-v2');
      if (comment.story_slug) actions.append(button('Open story', () => openStory(comment.story_slug)));
      if (comment.username) actions.append(button('Writer', () => openWriter(comment.username)));
      if (comment.moderation_state !== 'hidden') actions.append(button('Hide', () => commentAction(comment.id, 'hide', 'Hide this comment?'), 'button ghost admin-warning-v2'));
      if (comment.moderation_state !== 'removed') actions.append(button('Remove', () => commentAction(comment.id, 'remove', 'Remove this comment?'), 'button ghost admin-danger-v2'));
      if (comment.moderation_state !== 'visible') actions.append(button('Restore', () => commentAction(comment.id, 'restore', 'Restore this comment?'), 'button ghost admin-good-v2'));
      card.append(actions);
      list.append(card);
    });
    content.append(list);
  }

  async function renderUsers() {
    const users = await rpc('admin_list_users_v2', { p_query: state.query || null, p_status: state.filter || null, p_limit: 150 });
    const content = $('adminContentV2');
    content.replaceChildren();
    const list = node('div', 'admin-list-v2');
    if (!users.length) list.append(node('div', 'admin-empty-v2', 'No users match this filter.'));
    users.forEach((user) => {
      const card = node('article', 'admin-card-v2');
      const head = node('div', 'admin-card-head-v2');
      const title = node('div');
      title.append(node('h4', '', user.display_name || user.username), node('div', 'admin-card-meta-v2', `@${user.username} · joined ${formatDateTime(user.created_at)} · ${formatNumber(user.story_count)} stories · ${formatNumber(user.comment_count)} comments`));
      const pills = node('div', 'admin-actions-v2');
      pills.style.marginTop = '0';
      pills.append(statusPill(user.account_status), statusPill(user.moderation_state));
      if (user.is_admin) pills.append(statusPill('admin'));
      head.append(title, pills);
      card.append(head);
      if (user.suspension_until) card.append(node('div', 'admin-note-v2', `Suspension until: ${formatDateTime(user.suspension_until)}`));
      if (user.moderation_note) card.append(node('div', 'admin-note-v2', `Admin note: ${user.moderation_note}`));
      const actions = node('div', 'admin-actions-v2');
      actions.append(button('Open profile', () => openWriter(user.username)));
      if (!user.is_admin) {
        if (user.account_status !== 'restricted') actions.append(button('Restrict', () => userAction(user.id, 'restrict', null, 'Restrict this user from publishing and commenting?'), 'button ghost admin-warning-v2'));
        actions.append(button('Suspend 24h', () => userAction(user.id, 'suspend', new Date(Date.now() + 86400000).toISOString(), 'Suspend this user for 24 hours?'), 'button ghost admin-danger-v2'));
        actions.append(button('Suspend 7d', () => userAction(user.id, 'suspend', new Date(Date.now() + 7 * 86400000).toISOString(), 'Suspend this user for 7 days?'), 'button ghost admin-danger-v2'));
        actions.append(button('Suspend indefinitely', () => userAction(user.id, 'suspend', null, 'Suspend this user indefinitely?'), 'button ghost admin-danger-v2'));
        if (user.account_status !== 'active') actions.append(button('Reactivate', () => userAction(user.id, 'activate', null, 'Restore this account to active?'), 'button ghost admin-good-v2'));
        if (user.moderation_state === 'visible') actions.append(button('Hide profile', () => userAction(user.id, 'hide_profile', null, 'Hide this public profile?'), 'button ghost admin-warning-v2'));
        else actions.append(button('Show profile', () => userAction(user.id, 'show_profile', null, 'Restore this public profile?'), 'button ghost admin-good-v2'));
      }
      card.append(actions);
      list.append(card);
    });
    content.append(list);
  }

  async function renderAudit() {
    const actions = await rpc('admin_list_actions_v2', { p_limit: 200 });
    const content = $('adminContentV2');
    content.replaceChildren();
    if (!actions.length) {
      content.append(node('div', 'admin-empty-v2', 'No moderation actions have been logged yet.'));
      return;
    }
    const list = node('div', 'admin-audit-v2');
    actions.forEach((entry) => {
      const row = node('div', 'admin-audit-row-v2');
      row.append(node('span', '', formatDateTime(entry.created_at)), node('strong', '', entry.target_type || 'target'), node('div', '', `${entry.action}${entry.note ? ` — ${entry.note}` : ''}`));
      list.append(row);
    });
    content.append(list);
  }

  function adminNote(actionLabel) {
    return window.prompt(`${actionLabel}\n\nOptional private admin note:`, '');
  }

  async function changeReportStatus(report, status) {
    const note = adminNote(`Mark report as ${status}?`);
    if (note === null) return;
    try {
      await rpc('admin_set_report_status_v2', { p_report_id: report.id, p_status: status, p_note: note });
      toast(`Report marked ${status}.`);
      state.loading = false;
      await loadCurrentTab();
    } catch (error) { toast(error?.message || 'Report action failed.'); }
  }

  async function storyAction(id, action, confirmation) {
    if (confirmation && !window.confirm(confirmation)) return;
    const note = adminNote(`Story action: ${action}`);
    if (note === null) return;
    try {
      await rpc('admin_story_action_v2', { p_story_id: id, p_action: action, p_note: note });
      toast(`Story ${action} complete.`);
      state.loading = false;
      await loadCurrentTab();
    } catch (error) { toast(error?.message || 'Story action failed.'); }
  }

  async function commentAction(id, action, confirmation) {
    if (confirmation && !window.confirm(confirmation)) return;
    const note = adminNote(`Comment action: ${action}`);
    if (note === null) return;
    try {
      await rpc('admin_comment_action_v2', { p_comment_id: id, p_action: action, p_note: note });
      toast(`Comment ${action} complete.`);
      state.loading = false;
      await loadCurrentTab();
    } catch (error) { toast(error?.message || 'Comment action failed.'); }
  }

  async function userAction(id, action, until, confirmation) {
    if (confirmation && !window.confirm(confirmation)) return;
    const note = adminNote(`User action: ${action}`);
    if (note === null) return;
    try {
      await rpc('admin_user_action_v2', { p_user_id: id, p_action: action, p_note: note, p_until: until });
      toast(`User ${action} complete.`);
      state.loading = false;
      await loadCurrentTab();
    } catch (error) { toast(error?.message || 'User action failed.'); }
  }

  function openStory(slug) {
    if (!slug) return;
    $('adminControlV2')?.close();
    location.href = `${location.pathname}?story=${encodeURIComponent(slug)}#reader`;
  }

  function openWriter(username) {
    if (!username) return;
    $('adminControlV2')?.close();
    location.href = `${location.pathname}?writer=${encodeURIComponent(username)}#writer`;
  }

  async function boot() {
    inject();
    await refreshIdentity();
    hijackLegacyButton();

    db.auth.onAuthStateChange(() => {
      setTimeout(() => refreshIdentity().catch((error) => console.error('Admin identity refresh failed.', error)), 0);
    });
  }

  window.WriteLiteAdminV2 = { open: openAdminControl };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
