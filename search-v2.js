/* Writelite — proper site search V2: works + writers */
(() => {
  'use strict';

  const SUPABASE_URL = 'https://efftrxqdsrmyuaubjumh.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_C2qPiCHALCK9bvhFc8CpvA_Vc6tTGYo';
  const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });

  let works = [];
  let writers = [];
  let ready = false;
  let activeIndex = -1;
  let resultButtons = [];

  const text = value => value == null ? '' : String(value);
  const norm = value => text(value).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  const initials = value => text(value).trim().split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase() || 'W';

  function installStyles() {
    if (document.getElementById('searchV2Styles')) return;
    const style = document.createElement('style');
    style.id = 'searchV2Styles';
    style.textContent = `
      .search-box{position:relative;z-index:45}
      .search-box.search-v2-open input{border-color:rgba(232,168,86,.55);box-shadow:0 0 0 3px rgba(232,168,86,.08)}
      .search-v2-panel{position:absolute;top:calc(100% + 8px);right:0;width:min(560px,calc(100vw - 28px));max-height:min(620px,70vh);overflow:auto;background:#151923;color:#eef2f7;border:1px solid #343b4e;border-radius:16px;box-shadow:0 24px 70px rgba(0,0,0,.48);padding:8px;z-index:250}
      .search-v2-section{padding:7px 7px 5px;color:#9aa3b2;font-size:10px;font-weight:900;letter-spacing:1.2px;text-transform:uppercase}
      .search-v2-result{width:100%;border:0;background:transparent;color:inherit;text-align:left;display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:11px;align-items:center;padding:10px;border-radius:11px}
      .search-v2-result:hover,.search-v2-result.active{background:rgba(255,255,255,.07)}
      .search-v2-thumb{width:44px;height:44px;border-radius:10px;background:#292f40 center/cover no-repeat;display:grid;place-items:center;font-weight:800;overflow:hidden}
      .search-v2-thumb.writer{border-radius:50%}
      .search-v2-copy{min-width:0}.search-v2-copy strong,.search-v2-copy span,.search-v2-copy small{display:block}.search-v2-copy strong{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.search-v2-copy span{color:#c3c9d5;font-size:12px;margin-top:2px}.search-v2-copy small{color:#8891a2;font-size:11px;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .search-v2-kind{font-size:10px;color:#f1c986;border:1px solid rgba(241,201,134,.25);border-radius:999px;padding:5px 7px;white-space:nowrap}
      .search-v2-empty{padding:18px 14px;color:#9aa3b2;text-align:center}
      .writelite-search-active #feedEmpty{display:none!important}
      @media(max-width:680px){.search-v2-panel{position:fixed;left:10px;right:10px;top:120px;width:auto;max-height:65vh}.search-v2-result{grid-template-columns:40px minmax(0,1fr)}.search-v2-thumb{width:40px;height:40px}.search-v2-kind{display:none}}
    `;
    document.head.append(style);
  }

  async function loadIndex() {
    if (ready) return;
    const [workRes, writerRes] = await Promise.all([
      db.from('stories')
        .select('id,owner_id,title,slug,summary,genre,author_name,cover_url,published_at,created_at')
        .eq('status', 'published')
        .eq('visibility', 'public')
        .order('published_at', { ascending: false })
        .limit(300),
      db.from('profiles')
        .select('id,username,display_name,avatar_url,tagline,bio,genres,location')
        .order('created_at', { ascending: false })
        .limit(300),
    ]);

    if (workRes.error) console.warn('Search work index failed', workRes.error);
    if (writerRes.error) console.warn('Search writer index failed', writerRes.error);
    works = workRes.data || [];
    writers = writerRes.data || [];
    ready = true;
  }

  function workHaystack(item) {
    return norm([item.title, item.author_name, item.genre, item.summary].filter(Boolean).join(' '));
  }

  function writerHaystack(item) {
    return norm([item.display_name, item.username, item.tagline, item.bio, item.genres, item.location].filter(Boolean).join(' '));
  }

  function scoreMatch(haystack, query, primary = '') {
    if (!haystack.includes(query)) return -1;
    const p = norm(primary);
    if (p === query) return 100;
    if (p.startsWith(query)) return 80;
    if (haystack.startsWith(query)) return 65;
    return 40;
  }

  function openWork(item) {
    const url = new URL(location.href);
    url.search = '';
    url.searchParams.set('story', item.slug);
    url.hash = 'reader';
    location.href = url.toString();
  }

  function openWriter(item) {
    const url = new URL(location.href);
    url.search = '';
    url.searchParams.set('writer', item.username);
    url.hash = 'writer';
    location.href = url.toString();
  }

  function thumbForWork(item) {
    const thumb = document.createElement('div');
    thumb.className = 'search-v2-thumb';
    if (item.cover_url) thumb.style.backgroundImage = `url("${text(item.cover_url).replace(/"/g, '')}")`;
    else thumb.textContent = text(item.title).slice(0, 1).toUpperCase() || 'W';
    return thumb;
  }

  function thumbForWriter(item) {
    const thumb = document.createElement('div');
    thumb.className = 'search-v2-thumb writer';
    if (item.avatar_url) thumb.style.backgroundImage = `url("${text(item.avatar_url).replace(/"/g, '')}")`;
    else thumb.textContent = initials(item.display_name || item.username);
    return thumb;
  }

  function makeResult({ item, type }) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'search-v2-result';

    const copy = document.createElement('div');
    copy.className = 'search-v2-copy';
    const title = document.createElement('strong');
    const line = document.createElement('span');
    const sub = document.createElement('small');
    const kind = document.createElement('span');
    kind.className = 'search-v2-kind';

    if (type === 'work') {
      title.textContent = item.title;
      line.textContent = `by ${item.author_name || 'Anonymous writer'}`;
      sub.textContent = [item.genre, item.summary].filter(Boolean).join(' · ');
      kind.textContent = norm(item.genre) === 'poetry' ? 'Poem' : 'Work';
      button.append(thumbForWork(item), copy, kind);
      button.onclick = () => openWork(item);
    } else {
      title.textContent = item.display_name || item.username;
      line.textContent = `@${item.username}`;
      sub.textContent = item.tagline || item.bio || item.genres || 'Writer on Writelite';
      kind.textContent = 'Writer';
      button.append(thumbForWriter(item), copy, kind);
      button.onclick = () => openWriter(item);
    }

    copy.append(title, line, sub);
    return button;
  }

  function render(queryRaw) {
    const query = norm(queryRaw.trim());
    const input = document.getElementById('storySearch');
    const box = input?.closest('.search-box');
    const panel = document.getElementById('searchV2Panel');
    const feed = document.getElementById('storyFeedSection');
    if (!input || !box || !panel) return;

    if (query.length < 2) {
      panel.classList.add('hidden');
      box.classList.remove('search-v2-open');
      feed?.classList.remove('writelite-search-active');
      resultButtons = [];
      activeIndex = -1;
      return;
    }

    const workMatches = works
      .map(item => ({ item, score: scoreMatch(workHaystack(item), query, item.title) }))
      .filter(x => x.score >= 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(x => x.item);

    const writerMatches = writers
      .filter(item => item.username)
      .map(item => ({ item, score: scoreMatch(writerHaystack(item), query, item.display_name || item.username) }))
      .filter(x => x.score >= 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map(x => x.item);

    panel.replaceChildren();
    resultButtons = [];
    activeIndex = -1;

    if (!workMatches.length && !writerMatches.length) {
      const empty = document.createElement('div');
      empty.className = 'search-v2-empty';
      empty.textContent = `No works or writers found for “${queryRaw.trim()}”.`;
      panel.append(empty);
    }

    if (workMatches.length) {
      const heading = document.createElement('div');
      heading.className = 'search-v2-section';
      heading.textContent = 'Works';
      panel.append(heading);
      workMatches.forEach(item => {
        const result = makeResult({ item, type: 'work' });
        resultButtons.push(result);
        panel.append(result);
      });
    }

    if (writerMatches.length) {
      const heading = document.createElement('div');
      heading.className = 'search-v2-section';
      heading.textContent = 'Writers';
      panel.append(heading);
      writerMatches.forEach(item => {
        const result = makeResult({ item, type: 'writer' });
        resultButtons.push(result);
        panel.append(result);
      });
    }

    panel.classList.remove('hidden');
    box.classList.add('search-v2-open');
    feed?.classList.add('writelite-search-active');
  }

  function moveSelection(delta) {
    if (!resultButtons.length) return;
    activeIndex = (activeIndex + delta + resultButtons.length) % resultButtons.length;
    resultButtons.forEach((button, index) => button.classList.toggle('active', index === activeIndex));
    resultButtons[activeIndex].scrollIntoView({ block: 'nearest' });
  }

  async function boot() {
    installStyles();
    const input = document.getElementById('storySearch');
    const box = input?.closest('.search-box');
    if (!input || !box) return;

    input.placeholder = 'Search works, poems or writers…';
    input.setAttribute('aria-label', 'Search Writelite works and writers');
    input.setAttribute('aria-expanded', 'false');

    const panel = document.createElement('div');
    panel.id = 'searchV2Panel';
    panel.className = 'search-v2-panel hidden';
    panel.setAttribute('role', 'listbox');
    box.append(panel);

    let timer = null;
    input.addEventListener('focus', async () => {
      await loadIndex();
      if (input.value.trim().length >= 2) render(input.value);
    });

    input.addEventListener('input', async () => {
      clearTimeout(timer);
      await loadIndex();
      timer = setTimeout(() => render(input.value), 90);
    });

    input.addEventListener('keydown', event => {
      if (panel.classList.contains('hidden')) return;
      if (event.key === 'ArrowDown') { event.preventDefault(); moveSelection(1); }
      else if (event.key === 'ArrowUp') { event.preventDefault(); moveSelection(-1); }
      else if (event.key === 'Enter' && activeIndex >= 0) { event.preventDefault(); resultButtons[activeIndex]?.click(); }
      else if (event.key === 'Escape') { panel.classList.add('hidden'); box.classList.remove('search-v2-open'); document.getElementById('storyFeedSection')?.classList.remove('writelite-search-active'); }
    });

    document.addEventListener('click', event => {
      if (box.contains(event.target)) return;
      panel.classList.add('hidden');
      box.classList.remove('search-v2-open');
      document.getElementById('storyFeedSection')?.classList.remove('writelite-search-active');
    });

    await loadIndex();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

/* WriteLite — Von Boom homepage featured-poet presentation */
(() => {
  'use strict';

  const FEATURED_POEM_TITLE = 'I Know The Only Way';

  function polishFeaturedPoet() {
    const card = document.getElementById('featuredStory');
    if (!card) return;

    const title = card.querySelector('h2');
    const badge = card.querySelector('.badge');
    const author = card.querySelector('.story-author');
    const meta = card.querySelector('.featured-meta');
    const button = card.querySelector('.button.primary');

    const isVonBoomPoem =
      title?.textContent?.trim() === FEATURED_POEM_TITLE &&
      /poetry/i.test(meta?.textContent || '');

    if (!isVonBoomPoem) return;

    if (badge) badge.textContent = 'Featured Poet';
    if (author) author.textContent = 'Von Boom · Gavin Robinson';
    if (button) button.textContent = 'Read the poem →';
    card.dataset.featuredPoet = 'von-boom';
  }

  function bootFeaturedPoet() {
    const card = document.getElementById('featuredStory');
    if (!card) return;

    polishFeaturedPoet();
    new MutationObserver(polishFeaturedPoet).observe(card, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    [100, 300, 800, 1600].forEach(delay => setTimeout(polishFeaturedPoet, delay));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootFeaturedPoet);
  } else {
    bootFeaturedPoet();
  }
})();
