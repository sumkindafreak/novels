/* WriteLite — live reader presence + private admin visit totals */
(() => {
  'use strict';

  const SUPABASE_URL = 'https://efftrxqdsrmyuaubjumh.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_C2qPiCHALCK9bvhFc8CpvA_Vc6tTGYo';

  const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });

  const state = {
    user: null,
    isAdmin: false,
    presenceChannel: null,
    presenceKey: null,
  };

  const $ = (id) => document.getElementById(id);
  const formatNumber = (value) => new Intl.NumberFormat('en-GB').format(Number(value) || 0);

  function injectStyles() {
    if ($('visitorStatsV1Styles')) return;

    const style = document.createElement('style');
    style.id = 'visitorStatsV1Styles';
    style.textContent = `
      .live-readers-v1 {
        display: inline-flex;
        align-items: center;
        gap: 9px;
        margin-top: 17px;
        padding: 9px 12px;
        border: 1px solid var(--line, rgba(255,255,255,.10));
        border-radius: 999px;
        background: rgba(255,255,255,.045);
        color: var(--muted, #969eb0);
        font-size: 13px;
        line-height: 1;
      }
      .live-readers-dot-v1 {
        width: 8px;
        height: 8px;
        flex: 0 0 auto;
        border-radius: 50%;
        background: #7bd8a4;
        box-shadow: 0 0 0 4px rgba(123,216,164,.11);
      }
      .live-readers-v1[data-state="connecting"] .live-readers-dot-v1,
      .live-readers-v1[data-state="unavailable"] .live-readers-dot-v1 {
        background: var(--muted, #969eb0);
        box-shadow: none;
      }
      .live-readers-v1 strong { color: var(--text, #f2f3f7); font-weight: 800; }

      .admin-visitor-panel-v1 {
        max-width: 1000px;
        margin: 22px auto 0;
      }
      .visitor-grid-v1 {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 12px;
      }
      .visitor-stat-v1 {
        min-width: 0;
        padding: 17px;
        border: 1px solid var(--line, rgba(255,255,255,.10));
        border-radius: 14px;
        background: #121722;
      }
      .visitor-stat-v1 strong {
        display: block;
        margin-bottom: 5px;
        font-family: var(--serif, Georgia, serif);
        font-size: clamp(29px, 4vw, 42px);
        font-weight: 500;
        line-height: 1;
        color: var(--accent-2, #f1c986);
      }
      .visitor-stat-v1 span {
        display: block;
        color: var(--muted, #969eb0);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: .9px;
      }
      .visitor-admin-note-v1 {
        margin: 16px 0 0;
        color: var(--muted, #969eb0);
        font-size: 12px;
        line-height: 1.55;
      }
      .visitor-admin-error-v1 {
        margin: 14px 0 0;
        color: #ff9b9b;
        font-size: 13px;
      }
      @media (max-width: 720px) {
        .visitor-grid-v1 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      }
    `;
    document.head.append(style);
  }

  function injectLiveReaderBadge() {
    if ($('liveReadersV1')) return;

    const heroCopy = document.querySelector('#discoverView .hero-copy');
    if (!heroCopy) return;

    const badge = document.createElement('div');
    badge.id = 'liveReadersV1';
    badge.className = 'live-readers-v1';
    badge.dataset.state = 'connecting';
    badge.setAttribute('aria-live', 'polite');
    badge.setAttribute('title', 'Approximate number of people with WriteLite open right now.');
    badge.innerHTML = '<span class="live-readers-dot-v1" aria-hidden="true"></span><span id="liveReadersTextV1">Connecting live readers…</span>';

    const actions = heroCopy.querySelector('.hero-actions');
    if (actions) actions.insertAdjacentElement('afterend', badge);
    else heroCopy.append(badge);
  }

  function setLiveReaderCount(count) {
    const badge = $('liveReadersV1');
    const text = $('liveReadersTextV1');
    if (!badge || !text) return;

    const safeCount = Math.max(0, Number(count) || 0);
    badge.dataset.state = 'online';
    text.innerHTML = `<strong>${formatNumber(safeCount)}</strong> reader${safeCount === 1 ? '' : 's'} online`;
  }

  function setLiveReaderUnavailable() {
    const badge = $('liveReadersV1');
    const text = $('liveReadersTextV1');
    if (!badge || !text) return;
    badge.dataset.state = 'unavailable';
    text.textContent = 'Live reader count unavailable';
  }

  function createPresenceKey() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `reader-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function startPresence() {
    if (state.presenceChannel) return;

    state.presenceKey = createPresenceKey();
    const channel = db.channel('writelite-live-readers-v1', {
      config: { presence: { key: state.presenceKey } },
    });

    channel.on('presence', { event: 'sync' }, () => {
      const presence = channel.presenceState();
      const count = Object.values(presence).reduce((total, entries) => {
        if (Array.isArray(entries)) return total + entries.length;
        return total + 1;
      }, 0);
      setLiveReaderCount(count);
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        const result = await channel.track({ joined_at: new Date().toISOString() });
        if (result !== 'ok') console.warn('WriteLite presence track result:', result);
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        setLiveReaderUnavailable();
      }
    });

    state.presenceChannel = channel;

    window.addEventListener('pagehide', () => {
      if (state.presenceChannel) state.presenceChannel.untrack().catch(() => {});
    }, { once: true });
  }

  async function recordVisit() {
    const { error } = await db.rpc('record_site_visit');
    if (error) console.warn('WriteLite visit count could not be recorded:', error.message || error);
  }

  function injectAdminPanel() {
    if ($('adminVisitorPanelV1')) return;

    const profileContent = $('profileContent');
    if (!profileContent) return;

    const panel = document.createElement('section');
    panel.id = 'adminVisitorPanelV1';
    panel.className = 'panel admin-visitor-panel-v1 hidden';
    panel.innerHTML = `
      <div class="panel-heading">
        <div>
          <span class="eyebrow">Admin only</span>
          <h2>Visitor activity</h2>
        </div>
        <button id="refreshVisitorStatsV1" class="button ghost" type="button">Refresh</button>
      </div>
      <div class="visitor-grid-v1">
        <div class="visitor-stat-v1"><strong id="visitorTodayV1">—</strong><span>Today</span></div>
        <div class="visitor-stat-v1"><strong id="visitorYesterdayV1">—</strong><span>Yesterday</span></div>
        <div class="visitor-stat-v1"><strong id="visitorWeekV1">—</strong><span>Last 7 days</span></div>
        <div class="visitor-stat-v1"><strong id="visitorAllV1">—</strong><span>All time</span></div>
      </div>
      <p class="visitor-admin-note-v1">Private to WriteLite admins. A visit is one site load. The counter stores only the time of the visit — no names, emails, IP addresses or device identifiers.</p>
      <p id="visitorAdminErrorV1" class="visitor-admin-error-v1 hidden"></p>
    `;

    const signOut = $('profileSignOutButton');
    if (signOut && signOut.parentNode === profileContent) profileContent.insertBefore(panel, signOut);
    else profileContent.append(panel);

    $('refreshVisitorStatsV1')?.addEventListener('click', refreshAdminStats);
  }

  function showAdminPanel(show) {
    const panel = $('adminVisitorPanelV1');
    if (!panel) return;
    panel.classList.toggle('hidden', !show);
  }

  function setAdminError(message = '') {
    const node = $('visitorAdminErrorV1');
    if (!node) return;
    node.textContent = message;
    node.classList.toggle('hidden', !message);
  }

  async function refreshAdminStats() {
    if (!state.user || !state.isAdmin) return;

    const button = $('refreshVisitorStatsV1');
    if (button) {
      button.disabled = true;
      button.dataset.oldLabel = button.textContent;
      button.textContent = 'Refreshing…';
    }

    setAdminError('');
    const { data, error } = await db.rpc('get_admin_visitor_stats');

    if (button) {
      button.disabled = false;
      button.textContent = button.dataset.oldLabel || 'Refresh';
    }

    if (error) {
      console.warn('WriteLite admin visitor stats failed:', error);
      setAdminError('Visitor totals could not be loaded right now.');
      return;
    }

    const stats = data || {};
    if ($('visitorTodayV1')) $('visitorTodayV1').textContent = formatNumber(stats.today);
    if ($('visitorYesterdayV1')) $('visitorYesterdayV1').textContent = formatNumber(stats.yesterday);
    if ($('visitorWeekV1')) $('visitorWeekV1').textContent = formatNumber(stats.last_7_days);
    if ($('visitorAllV1')) $('visitorAllV1').textContent = formatNumber(stats.all_time);
  }

  async function loadAdminIdentity() {
    const { data: { session } } = await db.auth.getSession();
    state.user = session?.user || null;
    state.isAdmin = false;

    if (!state.user) {
      showAdminPanel(false);
      return;
    }

    const { data, error } = await db
      .from('profiles')
      .select('is_admin')
      .eq('id', state.user.id)
      .maybeSingle();

    if (error) {
      console.warn('WriteLite admin identity check failed:', error);
      showAdminPanel(false);
      return;
    }

    state.isAdmin = data?.is_admin === true;
    showAdminPanel(state.isAdmin);
    if (state.isAdmin) await refreshAdminStats();
  }

  function wireAdminRefresh() {
    window.addEventListener('hashchange', () => {
      if (location.hash === '#profile' && state.isAdmin) refreshAdminStats();
    });

    db.auth.onAuthStateChange(() => {
      setTimeout(() => loadAdminIdentity().catch((error) => console.error('Visitor admin refresh failed.', error)), 0);
    });
  }

  async function boot() {
    injectStyles();
    injectLiveReaderBadge();
    injectAdminPanel();
    wireAdminRefresh();
    startPresence();

    recordVisit().catch((error) => console.warn('Visit record failed.', error));
    await loadAdminIdentity();
  }

  boot().catch((error) => {
    console.error('WriteLite visitor stats failed to start.', error);
    setLiveReaderUnavailable();
  });
})();
