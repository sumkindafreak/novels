/* Writelite — Poetry section SAFE V2 (does not modify header/mobile navigation) */
(() => {
  'use strict';

  const SUPABASE_URL = 'https://efftrxqdsrmyuaubjumh.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_C2qPiCHALCK9bvhFc8CpvA_Vc6tTGYo';
  const VON_BOOM_PROFILE_ID = '12fae0ed-d168-4203-aedc-88988e06ee30';
  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });

  let poems = [];

  function formatDate(value) {
    if (!value) return '';
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
  }

  function installEntryStyles() {
    if (document.getElementById('poetrySafeV2Styles')) return;
    const style = document.createElement('style');
    style.id = 'poetrySafeV2Styles';
    style.textContent = `
      .poetry-entry-v2{margin:0 44px 8px;border:1px solid var(--line,rgba(255,255,255,.1));border-radius:20px;background:linear-gradient(120deg,rgba(33,40,56,.95),rgba(24,27,38,.96));padding:20px 22px;display:flex;align-items:center;justify-content:space-between;gap:20px;box-shadow:0 10px 30px rgba(0,0,0,.12)}
      .poetry-entry-v2 h3{margin:2px 0 5px;font-family:var(--serif);font-size:28px;font-weight:500}.poetry-entry-v2 p{margin:0;color:var(--muted);line-height:1.5}.poetry-entry-v2 .eyebrow{margin-bottom:2px}
      .poetry-back-v2{border:0;background:transparent;color:var(--muted);padding:8px 0 20px;font-weight:700}
      @media(max-width:720px){.poetry-entry-v2{margin:0 18px 8px;align-items:flex-start;flex-direction:column}.poetry-entry-v2 .button{width:100%}}
    `;
    document.head.append(style);
  }

  function installDiscoverEntry() {
    if (document.getElementById('poetryEntryV2')) return;
    const feed = document.getElementById('storyFeedSection');
    if (!feed) return;
    const entry = document.createElement('section');
    entry.id = 'poetryEntryV2';
    entry.className = 'poetry-entry-v2';
    entry.innerHTML = `
      <div>
        <span class="eyebrow">Writelite Poetry</span>
        <h3>Poetry has its own room.</h3>
        <p>Read poems, discover poets, and visit Von Boom's exclusive Writelite collection.</p>
      </div>
      <button id="openPoetryV2" class="button secondary" type="button">Explore poetry →</button>`;
    feed.parentNode.insertBefore(entry, feed);
    document.getElementById('openPoetryV2').onclick = () => showPoetry(true);
  }

  function installView() {
    if (document.getElementById('poetryView')) return;
    const main = document.querySelector('main');
    if (!main) return;
    const section = document.createElement('section');
    section.id = 'poetryView';
    section.className = 'view poetry-view-v1';
    section.innerHTML = `
      <div class="poetry-shell-v1">
        <button id="poetryBackV2" class="poetry-back-v2" type="button">← Back to Discover</button>
        <div class="poetry-hero-v1">
          <section class="poetry-intro-v1">
            <span class="eyebrow">Writelite Poetry</span>
            <h1>Words with<br><em>room to breathe.</em></h1>
            <p>A dedicated home for poems, spoken-word pieces and writing that does not need chapters to leave a mark.</p>
          </section>
          <aside id="poetrySpotlightV2" class="poetry-spotlight-v1" aria-live="polite">
            <span class="poetry-kicker-v1">Exclusive writer spotlight</span>
            <h2>Von Boom</h2>
            <div class="poetry-byline-v1">Gavin Robinson</div>
            <p>Loading his latest Writelite poem…</p>
          </aside>
        </div>
        <div class="poetry-section-head-v1">
          <div>
            <span class="eyebrow">Latest poetry</span>
            <h2>Poems on Writelite</h2>
            <p>Published by the writers who chose to share their work here.</p>
          </div>
        </div>
        <div id="poetryGridV2" class="poetry-grid-v1" aria-live="polite"></div>
      </div>`;
    main.append(section);
    document.getElementById('poetryBackV2').onclick = () => showDiscover();
  }

  function showDiscover() {
    document.getElementById('poetryView')?.classList.remove('active');
    const discoverButton = document.querySelector('[data-view="discover"]');
    if (discoverButton) discoverButton.click();
    else document.getElementById('discoverView')?.classList.add('active');
    history.replaceState(null, '', `${location.pathname}#discover`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function showPoetry(pushHash = true) {
    const poetry = document.getElementById('poetryView');
    if (!poetry) return;
    document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
    poetry.classList.add('active');
    if (pushHash) history.replaceState(null, '', `${location.pathname}#poetry`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (!poems.length) loadPoetry();
  }

  function openPoem(story) {
    const url = new URL(location.href);
    url.searchParams.set('story', story.slug);
    url.hash = 'reader';
    location.href = url.toString();
  }

  function renderSpotlight() {
    const node = document.getElementById('poetrySpotlightV2');
    if (!node) return;
    const vonBoom = poems.find(p => p.owner_id === VON_BOOM_PROFILE_ID) || poems[0];
    node.replaceChildren();

    const kicker = document.createElement('span');
    kicker.className = 'poetry-kicker-v1';
    kicker.textContent = 'Exclusive writer spotlight';
    const name = document.createElement('h2');
    name.textContent = vonBoom?.owner_id === VON_BOOM_PROFILE_ID ? 'Von Boom' : 'Poetry on Writelite';
    const byline = document.createElement('div');
    byline.className = 'poetry-byline-v1';
    byline.textContent = vonBoom ? (vonBoom.author_name || 'Writelite poet') : 'A new section for poetry';
    const charity = document.createElement('div');
    charity.className = 'poetry-charity-v1';
    charity.innerHTML = '<span aria-hidden="true">♡</span><div><strong>Writing with purpose.</strong><br>Von Boom is publishing his poetry exclusively on Writelite. He is planning a self-published collection of 10 poems, each with accompanying artwork, with 50% of profits going to MIND and ADHD charities.</div>';
    node.append(kicker, name, byline, charity);

    if (vonBoom) {
      const title = document.createElement('h3');
      title.style.margin = '0 0 8px';
      title.style.fontFamily = 'var(--serif)';
      title.style.fontSize = '27px';
      title.style.fontWeight = '500';
      title.textContent = vonBoom.title;
      const summary = document.createElement('p');
      summary.textContent = vonBoom.summary || 'Read the latest poem.';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'button primary';
      button.textContent = 'Read the poem →';
      button.onclick = () => openPoem(vonBoom);
      node.append(title, summary, button);
    }
  }

  function renderPoems() {
    const grid = document.getElementById('poetryGridV2');
    if (!grid) return;
    grid.replaceChildren();
    if (!poems.length) {
      const empty = document.createElement('div');
      empty.className = 'poetry-empty-v1';
      empty.innerHTML = '<h3>No poems published yet.</h3><p>The shelf is ready when the next poet is.</p></div>';
      grid.append(empty);
      return;
    }

    poems.forEach(story => {
      const card = document.createElement('article');
      card.className = 'poetry-card-v1';
      card.tabIndex = 0;
      const cover = document.createElement('div');
      cover.className = 'poetry-cover-v1';
      if (story.cover_url) cover.style.backgroundImage = `url("${String(story.cover_url).replace(/"/g, '')}")`;
      const body = document.createElement('div');
      body.className = 'poetry-card-body-v1';
      const title = document.createElement('h3');
      title.textContent = story.title;
      const author = document.createElement('div');
      author.className = 'poetry-card-author-v1';
      author.textContent = story.owner_id === VON_BOOM_PROFILE_ID ? `Von Boom · ${story.author_name || 'Gavin Robinson'}` : (story.author_name || 'Anonymous poet');
      const summary = document.createElement('p');
      summary.textContent = story.summary || 'Open the poem and read.';
      const footer = document.createElement('div');
      footer.className = 'poetry-card-footer-v1';
      const date = document.createElement('span');
      date.textContent = formatDate(story.published_at || story.created_at);
      const read = document.createElement('span');
      read.textContent = 'Read →';
      footer.append(date, read);
      body.append(title, author, summary, footer);
      card.append(cover, body);
      const open = () => openPoem(story);
      card.onclick = open;
      card.onkeydown = event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          open();
        }
      };
      grid.append(card);
    });
  }

  async function loadPoetry() {
    const grid = document.getElementById('poetryGridV2');
    if (grid && !grid.children.length) grid.innerHTML = '<div class="poetry-empty-v1"><p>Loading poetry…</p></div>';
    const { data, error } = await client.from('stories')
      .select('id,owner_id,author_name,title,slug,summary,genre,cover_url,published_at,created_at')
      .eq('status', 'published')
      .eq('visibility', 'public')
      .ilike('genre', 'poetry')
      .order('published_at', { ascending: false });
    if (error) {
      console.error('Poetry load failed', error);
      if (grid) grid.innerHTML = '<div class="poetry-empty-v1"><h3>Poetry could not be loaded.</h3><p>Please try again in a moment.</p></div>';
      return;
    }
    poems = data || [];
    renderSpotlight();
    renderPoems();
  }

  async function installPoetryReader() {
    const slug = new URLSearchParams(location.search).get('story');
    if (!slug) return;
    const { data: story, error } = await client.from('stories')
      .select('id,owner_id,title,slug,genre,author_name')
      .eq('slug', slug)
      .maybeSingle();
    if (error || !story || String(story.genre || '').toLowerCase() !== 'poetry') return;

    const { data: chapters, error: chaptersError } = await client.from('chapters')
      .select('id,position,title,content')
      .eq('story_id', story.id)
      .order('position');
    if (chaptersError || !chapters?.length) return;

    let patching = false;

    const patch = () => {
      const container = document.getElementById('readerChapter');
      if (!container || patching) return;
      const currentTitle = container.querySelector('h2')?.textContent?.trim();
      const chapter = chapters.find(item => item.title === currentTitle) || chapters[0];
      if (!chapter) return;

      // The normal story reader can render after this poetry patch during page load.
      // Only skip when the DOM is still genuinely using the poetry renderer.
      const isAlreadyPoetry =
        container.dataset.poetryPatchedV2 === String(chapter.id) &&
        !!container.querySelector('.poetry-copy-v3');
      if (isAlreadyPoetry) return;

      patching = true;
      try {
        container.dataset.poetryPatchedV2 = String(chapter.id);
        container.replaceChildren();

        const heading = document.createElement('h2');
        heading.textContent = chapter.title;

        // Keep the author's text exactly as saved. A poetry line is not a prose paragraph:
        // single line breaks, blank lines, indentation and spacing all remain meaningful.
        const copy = document.createElement('div');
        copy.className = 'poetry-copy-v3';
        copy.textContent = String(chapter.content || '').replace(/\r/g, '');

        container.append(heading, copy);
        document.getElementById('readerView')?.classList.add('poetry-reader-v1');

        if (story.owner_id === VON_BOOM_PROFILE_ID) {
          const meta = document.getElementById('readerMeta');
          if (meta && !meta.querySelector('.poetry-reader-badge-v1')) {
            const badge = document.createElement('div');
            badge.className = 'poetry-reader-badge-v1';
            badge.textContent = 'Writelite exclusive · 50% of planned collection profits to MIND / ADHD charities';
            meta.append(badge);
          }
        }
      } finally {
        patching = false;
      }
    };

    const reader = document.getElementById('readerChapter');
    if (reader) {
      new MutationObserver(() => setTimeout(patch, 0)).observe(reader, { childList: true, subtree: false });
    }
    [50, 100, 250, 500, 900, 1500, 2500].forEach(delay => setTimeout(patch, delay));
  }

  function installReaderStyles() {
    if (document.getElementById('poetryReaderStylesV2')) return;
    const style = document.createElement('style');
    style.id = 'poetryReaderStylesV2';
    style.textContent = `
      .poetry-reader-v1 .reader-paper{background:#f6f1e8}
      .reader-chapter .poetry-copy-v3{white-space:pre-wrap;text-indent:0!important;margin:0!important;line-height:1.8;text-align:left;overflow-wrap:break-word}
      .reader-chapter .poetry-stanza-v1{white-space:pre-wrap;text-indent:0!important;margin:0 0 1.65em!important;line-height:1.8;text-align:left}
      .poetry-reader-badge-v1{margin:14px 0 0;padding:9px 10px;border:1px solid rgba(232,168,86,.28);border-radius:10px;color:var(--accent-2);font-size:11px;line-height:1.4}
    `;
    document.head.append(style);
  }

  function boot() {
    installEntryStyles();
    installDiscoverEntry();
    installView();
    installReaderStyles();
    loadPoetry();
    installPoetryReader();
    window.addEventListener('hashchange', () => {
      if (location.hash === '#poetry') showPoetry(false);
    });
    if (location.hash === '#poetry') setTimeout(() => showPoetry(false), 100);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
