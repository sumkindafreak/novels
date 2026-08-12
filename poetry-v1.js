/* Writelite — Poetry section V1 */
(() => {
  'use strict';

  const SUPABASE_URL = 'https://efftrxqdsrmyuaubjumh.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_C2qPiCHALCK9bvhFc8CpvA_Vc6tTGYo';
  const VON_BOOM_PROFILE_ID = '12fae0ed-d168-4203-aedc-88988e06ee30';
  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });

  let poems = [];

  const formatDate = value => {
    if (!value) return '';
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
  };

  function installNavigation() {
    const nav = document.querySelector('.main-nav');
    if (!nav || document.getElementById('poetryNavButton')) return;
    const button = document.createElement('button');
    button.id = 'poetryNavButton';
    button.className = 'nav-link';
    button.type = 'button';
    button.textContent = 'Poetry';
    const discover = nav.querySelector('[data-view="discover"]');
    if (discover?.nextSibling) nav.insertBefore(button, discover.nextSibling);
    else nav.append(button);
    button.addEventListener('click', () => showPoetry(true));

    document.querySelectorAll('[data-view]').forEach(other => {
      other.addEventListener('click', () => {
        document.getElementById('poetryView')?.classList.remove('active');
        button.classList.remove('active');
      });
    });
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
        <div class="poetry-hero-v1">
          <section class="poetry-intro-v1">
            <span class="eyebrow">Writelite Poetry</span>
            <h1>Words with<br><em>room to breathe.</em></h1>
            <p>A dedicated home for poems, spoken-word pieces and writing that does not need chapters to leave a mark.</p>
          </section>
          <aside id="poetrySpotlightV1" class="poetry-spotlight-v1" aria-live="polite">
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
        <div id="poetryGridV1" class="poetry-grid-v1" aria-live="polite"></div>
      </div>`;
    const discover = document.getElementById('discoverView');
    if (discover?.nextSibling) main.insertBefore(section, discover.nextSibling);
    else main.append(section);
  }

  function showPoetry(pushHash = true) {
    const poetry = document.getElementById('poetryView');
    if (!poetry) return;
    document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
    poetry.classList.add('active');
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    document.getElementById('poetryNavButton')?.classList.add('active');
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
    const node = document.getElementById('poetrySpotlightV1');
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
    charity.innerHTML = '<span aria-hidden="true">♡</span><div><strong>Writing with purpose.</strong><br>Von Boom has chosen Writelite as the exclusive online home for his poetry. Profits from the work he sells support charities.</div>';
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
      button.addEventListener('click', () => openPoem(vonBoom));
      node.append(title, summary, button);
    }
  }

  function renderPoems() {
    const grid = document.getElementById('poetryGridV1');
    if (!grid) return;
    grid.replaceChildren();
    if (!poems.length) {
      const empty = document.createElement('div');
      empty.className = 'poetry-empty-v1';
      empty.innerHTML = '<h3>No poems published yet.</h3><p>The shelf is ready when the next poet is.</p>';
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
      card.addEventListener('click', open);
      card.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          open();
        }
      });
      grid.append(card);
    });
  }

  async function loadPoetry() {
    const grid = document.getElementById('poetryGridV1');
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

    const patch = () => {
      const container = document.getElementById('readerChapter');
      if (!container) return;
      const currentTitle = container.querySelector('h2')?.textContent?.trim();
      const chapter = chapters.find(item => item.title === currentTitle) || chapters[0];
      if (!chapter || container.dataset.poetryPatched === String(chapter.id)) return;
      container.dataset.poetryPatched = String(chapter.id);
      container.replaceChildren();
      const heading = document.createElement('h2');
      heading.textContent = chapter.title;
      container.append(heading);
      String(chapter.content || '').replace(/\r/g, '').split(/\n\s*\n+/).map(s => s.trim()).filter(Boolean).forEach(stanza => {
        const block = document.createElement('p');
        block.className = 'poetry-stanza-v1';
        block.textContent = stanza;
        container.append(block);
      });
      document.getElementById('readerView')?.classList.add('poetry-reader-v1');

      if (story.owner_id === VON_BOOM_PROFILE_ID) {
        const meta = document.getElementById('readerMeta');
        if (meta && !meta.querySelector('.poetry-reader-badge-v1')) {
          const badge = document.createElement('div');
          badge.className = 'poetry-reader-badge-v1';
          badge.textContent = 'Writelite exclusive · Profits from sold work support charities';
          meta.append(badge);
        }
      }
    };

    const reader = document.getElementById('readerChapter');
    if (reader) new MutationObserver(() => setTimeout(patch, 0)).observe(reader, { childList: true, subtree: false });
    [100, 350, 800, 1500].forEach(delay => setTimeout(patch, delay));
  }

  function installReaderStyles() {
    if (document.getElementById('poetryReaderStylesV1')) return;
    const style = document.createElement('style');
    style.id = 'poetryReaderStylesV1';
    style.textContent = `
      .poetry-reader-v1 .reader-paper{background:#f6f1e8}
      .reader-chapter .poetry-stanza-v1{white-space:pre-line;text-indent:0!important;margin:0 0 1.65em!important;line-height:1.8;text-align:left}
      .poetry-reader-badge-v1{margin:14px 0 0;padding:9px 10px;border:1px solid rgba(232,168,86,.28);border-radius:10px;color:var(--accent-2);font-size:11px;line-height:1.4}
    `;
    document.head.append(style);
  }

  function boot() {
    installNavigation();
    installView();
    installReaderStyles();
    loadPoetry();
    installPoetryReader();

    window.addEventListener('hashchange', () => {
      if (location.hash === '#poetry') showPoetry(false);
    });

    if (location.hash === '#poetry') {
      [100, 500, 1200].forEach(delay => setTimeout(() => {
        if (location.hash === '#poetry') showPoetry(false);
      }, delay));
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
