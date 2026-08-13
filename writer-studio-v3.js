/* WriteLite Writer Studio V3 — Sprint 1 foundation
 * Locked desktop/mobile shell, chapter editor, local recovery, Supabase autosave,
 * chapter ordering and Focus Mode.
 */
(() => {
  'use strict';

  const SUPABASE_URL = 'https://efftrxqdsrmyuaubjumh.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_C2qPiCHALCK9bvhFc8CpvA_Vc6tTGYo';
  const LOCKED_STORY_SLUGS = new Set(['balance-due']);
  const LOCAL_DRAFT_PREFIX = 'writelite-v3-draft:';
  const SERVER_SAVE_DELAY = 1300;
  const LOCAL_SAVE_DELAY = 220;
  const READING_WPM = 238;

  const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });

  const $ = (id) => document.getElementById(id);
  const state = {
    user: null,
    profile: null,
    stories: [],
    story: null,
    chapters: [],
    chapter: null,
    dirty: false,
    saving: false,
    serverTimer: null,
    localTimer: null,
    loadToken: 0,
    open: false,
    focus: false,
    mobileSheet: null,
    draggingChapterId: null,
  };

  function text(value) { return value == null ? '' : String(value); }
  function words(value) {
    const clean = text(value).replace(/\u00a0/g, ' ').trim();
    return clean ? clean.split(/\s+/).filter(Boolean).length : 0;
  }
  function formatNumber(value) { return new Intl.NumberFormat('en-GB').format(Number(value) || 0); }
  function formatTime(value) {
    if (!value) return 'Not saved yet';
    const then = new Date(value).getTime();
    const diff = Math.max(0, Date.now() - then);
    if (diff < 60000) return 'just now';
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(value));
  }
  function toast(message) {
    const n = $('toast');
    if (!n) return;
    n.textContent = message;
    n.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => n.classList.remove('show'), 3200);
  }
  function button(label, className = 'v3-icon-button', title = label) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = className;
    b.textContent = label;
    b.title = title;
    return b;
  }

  function inject() {
    if ($('studioV3Root')) return;
    const root = document.createElement('section');
    root.id = 'studioV3Root';
    root.className = 'studio-v3-root hidden';
    root.setAttribute('aria-label', 'WriteLite Writer Studio');
    root.innerHTML = `
      <header class="studio-v3-topbar">
        <div class="studio-v3-top-left">
          <button id="studioV3Exit" class="studio-v3-brand" type="button" title="Back to WriteLite"><span class="studio-v3-brand-mark">W</span><strong>WriteLite</strong></button>
          <label class="sr-only" for="studioV3Project">Project</label>
          <select id="studioV3Project" class="studio-v3-project-select"></select>
          <span id="studioV3SaveTop" class="studio-v3-save-chip" data-state="saved">Saved</span>
        </div>
        <div class="studio-v3-top-meta">
          <span><strong id="studioV3TotalWordsTop">0</strong> words</span>
          <span class="studio-v3-meta-dot">•</span>
          <span>Last edited <span id="studioV3LastEdited">—</span></span>
        </div>
        <div class="studio-v3-top-actions">
          <button id="studioV3Focus" class="studio-v3-focus-button" type="button">◎ <span>Focus Mode</span></button>
          <button id="studioV3CollapseLeft" class="v3-icon-button desktop-only-v3" type="button" title="Toggle project rail">☰</button>
          <button id="studioV3CollapseRight" class="v3-icon-button desktop-only-v3" type="button" title="Toggle Story Tools">◫</button>
        </div>
      </header>

      <div class="studio-v3-workspace">
        <aside class="studio-v3-left" id="studioV3Left">
          <div class="studio-v3-new-row">
            <button id="studioV3NewChapter" class="studio-v3-new-button" type="button">＋ New chapter</button>
          </div>
          <nav class="studio-v3-section-nav" aria-label="Project sections">
            <button type="button" data-v3-section="overview">⌂ <span>Overview</span></button>
            <button class="active" type="button" data-v3-section="chapters">▣ <span>Chapters</span></button>
            <button type="button" data-v3-section="notes">▤ <span>Notes</span><small>Sprint 2</small></button>
            <button type="button" data-v3-section="characters">♙ <span>Characters</span><small>Sprint 2</small></button>
            <button type="button" data-v3-section="places">⌖ <span>Places</span><small>Sprint 2</small></button>
            <button type="button" data-v3-section="drafts">▱ <span>Drafts</span><small>Sprint 3</small></button>
            <button type="button" data-v3-section="trash">♲ <span>Trash</span><small>Sprint 3</small></button>
          </nav>
          <div class="studio-v3-left-heading"><span>CHAPTERS</span><button id="studioV3AddChapterMini" type="button" title="New chapter">＋</button></div>
          <div id="studioV3ChapterList" class="studio-v3-chapter-list" aria-live="polite"></div>
          <div class="studio-v3-progress-card">
            <div class="studio-v3-progress-ring" id="studioV3ProgressRing"><span id="studioV3ProgressPercent">—</span></div>
            <div><small>Project progress</small><strong id="studioV3ProgressWords">0 words</strong><span id="studioV3ProgressHint">Set a target in Sprint 2</span></div>
          </div>
        </aside>

        <main class="studio-v3-editor-pane" id="studioV3EditorPane">
          <div id="studioV3LockedBanner" class="studio-v3-locked hidden"><strong>Version-controlled manuscript</strong><span>This title is read-only in Writer Studio. Its manuscript remains locked to the GitHub source.</span></div>
          <div class="studio-v3-editor-head">
            <div class="studio-v3-chapter-heading">
              <span id="studioV3ChapterNumber" class="studio-v3-chapter-kicker">CHAPTER</span>
              <input id="studioV3ChapterTitle" class="studio-v3-title-input" maxlength="160" placeholder="Untitled chapter" aria-label="Chapter title" />
            </div>
            <button id="studioV3ChapterMenu" class="v3-icon-button" type="button" title="Chapter actions">⋮</button>
          </div>

          <div class="studio-v3-toolbar" id="studioV3Toolbar" role="toolbar" aria-label="Formatting">
            <select id="studioV3BlockFormat" title="Text style" aria-label="Text style"><option value="p">Paragraph</option><option value="h2">Heading</option><option value="h3">Subheading</option><option value="blockquote">Quote</option></select>
            <span class="studio-v3-toolbar-rule"></span>
            <button type="button" data-v3-command="bold" title="Bold"><strong>B</strong></button>
            <button type="button" data-v3-command="italic" title="Italic"><em>I</em></button>
            <button type="button" data-v3-command="underline" title="Underline"><u>U</u></button>
            <button type="button" data-v3-command="strikeThrough" title="Strikethrough"><s>S</s></button>
            <span class="studio-v3-toolbar-rule"></span>
            <button type="button" data-v3-command="justifyLeft" title="Align left">≡</button>
            <button type="button" data-v3-command="insertUnorderedList" title="Bullet list">•≡</button>
            <button type="button" data-v3-command="insertOrderedList" title="Numbered list">1≡</button>
            <button id="studioV3SceneDivider" type="button" title="Insert scene divider">⁕</button>
            <span class="studio-v3-toolbar-rule"></span>
            <button id="studioV3Undo" type="button" title="Undo">↶</button>
            <button id="studioV3Redo" type="button" title="Redo">↷</button>
          </div>

          <div class="studio-v3-paper-wrap">
            <article id="studioV3Editor" class="studio-v3-editor" contenteditable="true" role="textbox" aria-multiline="true" spellcheck="true" data-placeholder="Start writing…"></article>
          </div>
        </main>

        <aside class="studio-v3-right" id="studioV3Right">
          <div class="studio-v3-tools-head"><strong>Story Tools</strong><span>Sprint 1</span></div>
          <div class="studio-v3-tool-tabs"><button class="active" type="button">Chapter</button><button type="button" disabled>Characters</button><button type="button" disabled>Goals</button><button type="button" disabled>Checklist</button></div>
          <div class="studio-v3-tool-scroll">
            <section class="studio-v3-tool-card">
              <div class="studio-v3-tool-title"><span>Chapter snapshot</span></div>
              <div class="studio-v3-snapshot-grid"><div><strong id="studioV3SideWords">0</strong><span>Words</span></div><div><strong id="studioV3SideRead">0m</strong><span>Est. read</span></div><div><strong id="studioV3SidePosition">—</strong><span>Position</span></div></div>
            </section>
            <section class="studio-v3-tool-card studio-v3-sprint-card"><span class="eyebrow">Next sprint</span><h3>Chapter Notes</h3><p>Private notes tied to this chapter will live here without appearing in the published manuscript.</p></section>
            <section class="studio-v3-tool-card studio-v3-sprint-card"><span class="eyebrow">Next sprint</span><h3>Characters · Goals · Checklist</h3><p>Story-world planning stays beside the manuscript and changes with the active chapter.</p></section>
          </div>
        </aside>
      </div>

      <footer class="studio-v3-statusbar">
        <div class="studio-v3-status-group"><span>Words in Chapter <strong id="studioV3ChapterWords">0</strong></span><span>Total Words <strong id="studioV3TotalWords">0</strong></span></div>
        <div class="studio-v3-status-group studio-v3-save-status"><span id="studioV3SaveIcon">✓</span><span id="studioV3SaveBottom">Saved</span></div>
        <div class="studio-v3-status-group studio-v3-status-centre"><button id="studioV3StatusUndo" type="button">↶</button><button id="studioV3StatusRedo" type="button">↷</button><button id="studioV3StatusFocus" type="button">⛶ Distraction Free</button></div>
        <div class="studio-v3-status-group"><span>Readability <strong id="studioV3Readability">Good</strong></span><span>Est. Reading Time <strong id="studioV3ReadTime">0 min</strong></span></div>
      </footer>

      <nav class="studio-v3-mobile-nav" aria-label="Writer Studio mobile navigation">
        <button type="button" data-v3-mobile="chapters">▣<span>Studio</span></button>
        <button type="button" data-v3-mobile="notes">▤<span>Notes</span></button>
        <button type="button" data-v3-mobile="tools">⌘<span>Tools</span></button>
        <button type="button" data-v3-mobile="more">☰<span>More</span></button>
      </nav>

      <div id="studioV3MobileBackdrop" class="studio-v3-mobile-backdrop hidden"></div>
      <section id="studioV3MobileSheet" class="studio-v3-mobile-sheet" aria-label="Studio panel" aria-hidden="true">
        <div class="studio-v3-sheet-handle"></div>
        <header><div><span id="studioV3MobileEyebrow" class="eyebrow">Studio</span><h2 id="studioV3MobileTitle">Chapters</h2></div><button id="studioV3MobileClose" class="v3-icon-button" type="button">×</button></header>
        <div id="studioV3MobileContent" class="studio-v3-mobile-content"></div>
      </section>

      <div id="studioV3ChapterPopover" class="studio-v3-popover hidden" role="menu">
        <button type="button" data-v3-chapter-action="duplicate" disabled title="Available in Sprint 3">Duplicate · Sprint 3</button>
        <button type="button" data-v3-chapter-action="delete" disabled title="Trash arrives in Sprint 3">Move to Trash · Sprint 3</button>
      </div>
    `;
    document.body.append(root);
    bindUI();
  }

  function bindUI() {
    $('studioV3Exit').onclick = exitStudio;
    $('studioV3Project').onchange = async (e) => { await selectStory(e.target.value); };
    $('studioV3NewChapter').onclick = createChapter;
    $('studioV3AddChapterMini').onclick = createChapter;
    $('studioV3Focus').onclick = toggleFocus;
    $('studioV3StatusFocus').onclick = toggleFocus;
    $('studioV3CollapseLeft').onclick = () => $('studioV3Root').classList.toggle('left-collapsed');
    $('studioV3CollapseRight').onclick = () => $('studioV3Root').classList.toggle('right-collapsed');
    $('studioV3ChapterTitle').addEventListener('input', editorChanged);
    $('studioV3Editor').addEventListener('input', editorChanged);
    $('studioV3Editor').addEventListener('paste', cleanPaste);
    $('studioV3Editor').addEventListener('keydown', editorShortcuts);
    $('studioV3BlockFormat').onchange = (e) => applyFormat('formatBlock', e.target.value);
    $('studioV3Toolbar').addEventListener('click', (e) => {
      const b = e.target.closest('[data-v3-command]');
      if (!b) return;
      applyFormat(b.dataset.v3Command);
    });
    $('studioV3SceneDivider').onclick = () => {
      if (state.story && isLockedStory(state.story)) return;
      document.execCommand('insertHTML', false, '<p class="scene-divider-v3">* * *</p><p><br></p>');
      editorChanged();
    };
    $('studioV3Undo').onclick = () => document.execCommand('undo');
    $('studioV3Redo').onclick = () => document.execCommand('redo');
    $('studioV3StatusUndo').onclick = () => document.execCommand('undo');
    $('studioV3StatusRedo').onclick = () => document.execCommand('redo');
    $('studioV3ChapterMenu').onclick = (e) => toggleChapterPopover(e.currentTarget);
    document.addEventListener('click', closePopoverOnOutside);
    document.querySelectorAll('[data-v3-section]').forEach((b) => b.addEventListener('click', () => leftSection(b.dataset.v3Section)));
    document.querySelectorAll('[data-v3-mobile]').forEach((b) => b.addEventListener('click', () => openMobileSheet(b.dataset.v3Mobile)));
    $('studioV3MobileClose').onclick = closeMobileSheet;
    $('studioV3MobileBackdrop').onclick = closeMobileSheet;
    window.addEventListener('beforeunload', cacheLocalDraftNow);
    window.addEventListener('resize', () => { if (window.innerWidth > 820) closeMobileSheet(); });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') cacheLocalDraftNow();
      else updateRelativeTimes();
    });
    setInterval(updateRelativeTimes, 30000);
  }

  async function refreshIdentity() {
    const { data: { session } } = await db.auth.getSession();
    state.user = session?.user || null;
    state.profile = null;
    if (state.user) {
      const { data } = await db.from('profiles').select('id,username,display_name').eq('id', state.user.id).maybeSingle();
      state.profile = data || null;
    }
    return state.user;
  }

  function isWriteViewActive() {
    return $('writeView')?.classList.contains('active');
  }

  async function maybeOpenStudio() {
    await refreshIdentity();
    if (!state.user || !isWriteViewActive()) {
      closeStudio(false);
      return;
    }
    await openStudio();
  }

  async function openStudio() {
    if (!state.user) return;
    inject();
    const root = $('studioV3Root');
    root.classList.remove('hidden');
    document.body.classList.add('studio-v3-running');
    state.open = true;
    await loadStories();
  }

  function closeStudio(resetView = false) {
    const root = $('studioV3Root');
    if (root) root.classList.add('hidden');
    document.body.classList.remove('studio-v3-running', 'studio-v3-focus-body');
    state.open = false;
    state.focus = false;
    if (resetView) exitStudio();
  }

  async function exitStudio() {
    await flushSave();
    closeStudio(false);
    const discover = document.querySelector('[data-view="discover"]');
    if (discover) discover.click();
    else location.hash = '#discover';
  }

  async function loadStories() {
    const token = ++state.loadToken;
    setSaveState('loading', 'Loading…');
    const { data, error } = await db.from('stories').select('*').eq('owner_id', state.user.id).order('updated_at', { ascending: false });
    if (token !== state.loadToken) return;
    if (error) {
      console.error(error);
      setSaveState('error', 'Could not load projects');
      return toast('Could not load your Writer Studio projects.');
    }
    state.stories = data || [];
    renderProjectSelect();
    if (!state.stories.length) {
      state.story = null;
      state.chapters = [];
      state.chapter = null;
      renderEmptyStudio();
      return;
    }
    const preferred = state.story && state.stories.find((s) => s.id === state.story.id);
    await selectStory((preferred || state.stories[0]).id, { skipFlush: true });
  }

  function renderProjectSelect() {
    const select = $('studioV3Project');
    if (!select) return;
    select.replaceChildren();
    if (!state.stories.length) {
      const option = document.createElement('option');
      option.textContent = 'No projects yet';
      option.value = '';
      select.append(option);
      select.disabled = true;
      return;
    }
    select.disabled = false;
    state.stories.forEach((story) => {
      const option = document.createElement('option');
      option.value = story.id;
      option.textContent = story.title || 'Untitled project';
      select.append(option);
    });
    if (state.story) select.value = state.story.id;
  }

  async function selectStory(id, options = {}) {
    if (!id) return;
    if (!options.skipFlush) await flushSave();
    const next = state.stories.find((s) => s.id === id);
    if (!next) return;
    state.story = next;
    state.chapter = null;
    renderProjectSelect();
    $('studioV3LockedBanner').classList.toggle('hidden', !isLockedStory(next));
    $('studioV3NewChapter').disabled = isLockedStory(next);
    $('studioV3AddChapterMini').disabled = isLockedStory(next);
    setEditorEditable(!isLockedStory(next));
    await loadChapters();
  }

  function isLockedStory(story) { return !!story && LOCKED_STORY_SLUGS.has(story.slug); }

  async function loadChapters(preferredId = null) {
    if (!state.story) return;
    const { data, error } = await db.from('chapters').select('id,story_id,position,title,content,content_rich,created_at,updated_at').eq('story_id', state.story.id).order('position');
    if (error) {
      console.error(error);
      state.chapters = [];
      renderChapters();
      renderEmptyEditor('Could not load chapters.');
      return;
    }
    state.chapters = data || [];
    renderChapters();
    const preferred = preferredId && state.chapters.find((c) => c.id === preferredId);
    const current = state.chapter && state.chapters.find((c) => c.id === state.chapter.id);
    const next = preferred || current || state.chapters[0] || null;
    if (next) await openChapter(next, { skipFlush: true });
    else renderEmptyEditor(isLockedStory(state.story) ? 'This locked title has no editable Studio chapters.' : 'Create your first chapter to start writing.');
    updateProjectStats();
  }

  function renderEmptyStudio() {
    $('studioV3Project').disabled = true;
    $('studioV3ChapterList').innerHTML = '<div class="studio-v3-empty">No projects yet.<br><small>Exit Studio and create a story from the current New Story form.</small></div>';
    renderEmptyEditor('Create a story first, then return to Writer Studio.');
    setSaveState('saved', 'Ready');
    updateProjectStats();
  }

  function renderEmptyEditor(message) {
    state.chapter = null;
    $('studioV3ChapterNumber').textContent = 'CHAPTER';
    $('studioV3ChapterTitle').value = '';
    $('studioV3ChapterTitle').disabled = true;
    $('studioV3Editor').innerHTML = '';
    $('studioV3Editor').contentEditable = 'false';
    $('studioV3Editor').dataset.placeholder = message;
    updateChapterStats();
  }

  function renderChapters() {
    const list = $('studioV3ChapterList');
    if (!list) return;
    list.replaceChildren();
    if (!state.chapters.length) {
      list.append(Object.assign(document.createElement('div'), { className: 'studio-v3-empty', textContent: isLockedStory(state.story) ? 'No Studio chapters.' : 'No chapters yet.' }));
      return;
    }
    state.chapters.forEach((chapter, index) => {
      const row = document.createElement('div');
      row.className = `studio-v3-chapter-row${state.chapter?.id === chapter.id ? ' active' : ''}`;
      row.draggable = !isLockedStory(state.story);
      row.dataset.chapterId = chapter.id;

      const drag = button('⠿', 'studio-v3-drag', 'Drag to reorder');
      drag.tabIndex = -1;
      const title = button('', 'studio-v3-chapter-open', `Open ${chapter.title}`);
      const strong = document.createElement('strong');
      strong.textContent = chapter.title || `Chapter ${chapter.position}`;
      const small = document.createElement('small');
      small.textContent = `${formatNumber(words(chapter.content))} words`;
      title.append(strong, small);
      title.onclick = () => openChapter(chapter);

      const controls = document.createElement('div');
      controls.className = 'studio-v3-chapter-row-actions';
      const up = button('↑', 'v3-mini-button', 'Move chapter up');
      const down = button('↓', 'v3-mini-button', 'Move chapter down');
      up.disabled = index === 0 || isLockedStory(state.story);
      down.disabled = index === state.chapters.length - 1 || isLockedStory(state.story);
      up.onclick = (e) => { e.stopPropagation(); moveChapterStep(chapter, -1); };
      down.onclick = (e) => { e.stopPropagation(); moveChapterStep(chapter, 1); };
      controls.append(up, down);
      row.append(drag, title, controls);

      row.addEventListener('dragstart', (e) => {
        state.draggingChapterId = chapter.id;
        row.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', chapter.id);
      });
      row.addEventListener('dragend', () => { state.draggingChapterId = null; row.classList.remove('dragging'); document.querySelectorAll('.studio-v3-chapter-row').forEach((r) => r.classList.remove('drag-over')); });
      row.addEventListener('dragover', (e) => { if (!state.draggingChapterId || state.draggingChapterId === chapter.id) return; e.preventDefault(); row.classList.add('drag-over'); });
      row.addEventListener('dragleave', () => row.classList.remove('drag-over'));
      row.addEventListener('drop', async (e) => {
        e.preventDefault();
        row.classList.remove('drag-over');
        const fromId = state.draggingChapterId || e.dataTransfer.getData('text/plain');
        await moveChapterTo(fromId, chapter.id);
      });
      list.append(row);
    });
  }

  async function openChapter(chapter, options = {}) {
    if (!chapter) return;
    if (!options.skipFlush) await flushSave();
    const fresh = state.chapters.find((c) => c.id === chapter.id) || chapter;
    state.chapter = fresh;
    state.dirty = false;
    $('studioV3ChapterTitle').disabled = isLockedStory(state.story);
    $('studioV3ChapterTitle').value = fresh.title || '';
    $('studioV3ChapterNumber').textContent = `CHAPTER ${fresh.position || ''}`.trim();
    $('studioV3Editor').dataset.placeholder = 'Start writing…';
    setEditorEditable(!isLockedStory(state.story));

    const draft = readLocalDraft(fresh);
    if (draft) {
      $('studioV3ChapterTitle').value = draft.title || fresh.title || '';
      setEditorHTML(draft.html || plainToHtml(draft.content || fresh.content || ''));
      state.dirty = true;
      setSaveState('recovered', 'Recovered local draft');
      scheduleServerSave();
    } else {
      setEditorHTML(fresh.content_rich || plainToHtml(fresh.content || ''));
      setSaveState('saved', 'Saved');
    }
    renderChapters();
    updateChapterStats();
    updateProjectStats();
    closeMobileSheet();
    requestAnimationFrame(() => {
      if (window.innerWidth > 820 && !isLockedStory(state.story)) $('studioV3Editor').focus({ preventScroll: true });
    });
  }

  function setEditorEditable(editable) {
    const editor = $('studioV3Editor');
    if (!editor) return;
    editor.contentEditable = editable ? 'true' : 'false';
    editor.classList.toggle('read-only', !editable);
    $('studioV3Toolbar').classList.toggle('disabled', !editable);
  }

  function plainToHtml(value) {
    const div = document.createElement('div');
    const parts = text(value).replace(/\r\n/g, '\n').split(/\n{2,}/);
    if (!parts.length || (parts.length === 1 && !parts[0])) return '';
    parts.forEach((part) => {
      const p = document.createElement('p');
      p.textContent = part.replace(/\n/g, '\n');
      div.append(p);
    });
    return div.innerHTML;
  }

  function sanitizeRichHTML(html) {
    const template = document.createElement('template');
    template.innerHTML = text(html);
    const allowed = new Set(['P','DIV','BR','STRONG','B','EM','I','U','S','UL','OL','LI','H2','H3','BLOCKQUOTE','HR','SPAN']);
    const walk = (parent) => {
      [...parent.children].forEach((el) => {
        if (!allowed.has(el.tagName)) {
          if (['SCRIPT','STYLE','IFRAME','OBJECT','EMBED','SVG','MATH','LINK','META'].includes(el.tagName)) {
            el.remove();
            return;
          }
          el.replaceWith(...el.childNodes);
          return;
        }
        [...el.attributes].forEach((attr) => {
          if (attr.name !== 'class' || (el.tagName !== 'P' && el.tagName !== 'SPAN')) el.removeAttribute(attr.name);
        });
        if (el.hasAttribute('class') && !/^scene-divider-v3$/.test(el.className)) el.removeAttribute('class');
        walk(el);
      });
    };
    walk(template.content);
    return template.innerHTML;
  }

  function setEditorHTML(html) { $('studioV3Editor').innerHTML = sanitizeRichHTML(html); }
  function editorPlainText() { return text($('studioV3Editor')?.innerText).replace(/\u00a0/g, ' ').replace(/\n{3,}/g, '\n\n').trimEnd(); }
  function editorRichHTML() { return sanitizeRichHTML($('studioV3Editor')?.innerHTML || ''); }

  function cleanPaste(event) {
    if (isLockedStory(state.story)) return;
    event.preventDefault();
    const plain = event.clipboardData?.getData('text/plain') || '';
    document.execCommand('insertText', false, plain);
  }

  function applyFormat(command, value = null) {
    if (!state.chapter || isLockedStory(state.story)) return;
    $('studioV3Editor').focus();
    document.execCommand(command, false, value);
    editorChanged();
  }

  function editorShortcuts(event) {
    if (!(event.ctrlKey || event.metaKey)) return;
    const key = event.key.toLowerCase();
    if (key === 's') { event.preventDefault(); flushSave(); }
    if (key === 'b') { event.preventDefault(); applyFormat('bold'); }
    if (key === 'i') { event.preventDefault(); applyFormat('italic'); }
    if (key === 'u') { event.preventDefault(); applyFormat('underline'); }
    if (key === 'enter' && event.shiftKey) { event.preventDefault(); toggleFocus(); }
  }

  function editorChanged() {
    if (!state.chapter || !state.story || isLockedStory(state.story)) return;
    state.dirty = true;
    setSaveState('saving', 'Saving…');
    updateChapterStats();
    updateProjectStats(true);
    scheduleLocalSave();
    scheduleServerSave();
  }

  function draftKey(storyId = state.story?.id, chapterId = state.chapter?.id) { return `${LOCAL_DRAFT_PREFIX}${storyId}:${chapterId}`; }

  function scheduleLocalSave() {
    clearTimeout(state.localTimer);
    state.localTimer = setTimeout(cacheLocalDraftNow, LOCAL_SAVE_DELAY);
  }

  function cacheLocalDraftNow() {
    if (!state.story || !state.chapter || isLockedStory(state.story) || !state.dirty) return;
    try {
      localStorage.setItem(draftKey(), JSON.stringify({
        title: $('studioV3ChapterTitle').value,
        content: editorPlainText(),
        html: editorRichHTML(),
        at: Date.now(),
      }));
    } catch (error) {
      console.warn('WriteLite local draft cache failed.', error);
    }
  }

  function readLocalDraft(chapter) {
    if (!state.story || !chapter) return null;
    try {
      const raw = localStorage.getItem(draftKey(state.story.id, chapter.id));
      if (!raw) return null;
      const draft = JSON.parse(raw);
      if (!draft?.at) return null;
      const serverAt = new Date(chapter.updated_at || chapter.created_at || 0).getTime();
      const differs = text(draft.content).trimEnd() !== text(chapter.content).trimEnd() || text(draft.title) !== text(chapter.title);
      return draft.at > serverAt + 500 && differs ? draft : null;
    } catch { return null; }
  }

  function scheduleServerSave() {
    clearTimeout(state.serverTimer);
    state.serverTimer = setTimeout(() => saveCurrentChapter(), SERVER_SAVE_DELAY);
  }

  async function flushSave() {
    clearTimeout(state.localTimer);
    clearTimeout(state.serverTimer);
    cacheLocalDraftNow();
    if (state.dirty) await saveCurrentChapter();
  }

  async function saveCurrentChapter() {
    if (!state.user || !state.story || !state.chapter || !state.dirty || state.saving || isLockedStory(state.story)) return;
    state.saving = true;
    const chapterId = state.chapter.id;
    const title = $('studioV3ChapterTitle').value.trim() || 'Untitled chapter';
    const content = editorPlainText();
    const contentRich = editorRichHTML();
    setSaveState('saving', 'Saving…');
    try {
      const updatedAt = new Date().toISOString();
      const { data, error } = await db.from('chapters').update({ title, content, content_rich: contentRich || null, updated_at: updatedAt }).eq('id', chapterId).eq('story_id', state.story.id).select('id,story_id,position,title,content,content_rich,created_at,updated_at').single();
      if (error) throw error;
      const index = state.chapters.findIndex((c) => c.id === chapterId);
      if (index >= 0) state.chapters[index] = data;
      if (state.chapter?.id === chapterId) state.chapter = data;
      state.dirty = false;
      localStorage.removeItem(draftKey(state.story.id, chapterId));
      setSaveState('saved', 'Saved');
      renderChapters();
      updateChapterStats();
      updateProjectStats();
    } catch (error) {
      console.error('WriteLite V3 save failed.', error);
      state.dirty = true;
      cacheLocalDraftNow();
      setSaveState('error', 'Sync error — draft safe');
    } finally {
      state.saving = false;
    }
  }

  function setSaveState(kind, label) {
    const top = $('studioV3SaveTop');
    const bottom = $('studioV3SaveBottom');
    const icon = $('studioV3SaveIcon');
    if (top) { top.dataset.state = kind; top.textContent = label; }
    if (bottom) bottom.textContent = label;
    if (icon) icon.textContent = kind === 'saving' || kind === 'loading' ? '↻' : kind === 'error' ? '!' : kind === 'recovered' ? '↺' : '✓';
  }

  async function createChapter() {
    if (!state.story || isLockedStory(state.story)) return;
    await flushSave();
    const position = (state.chapters.at(-1)?.position || 0) + 1;
    const { data, error } = await db.from('chapters').insert({ story_id: state.story.id, position, title: `Chapter ${position}`, content: '', content_rich: null }).select('id,story_id,position,title,content,content_rich,created_at,updated_at').single();
    if (error) return toast(error.message || 'Could not create chapter.');
    state.chapters.push(data);
    renderChapters();
    await openChapter(data, { skipFlush: true });
    $('studioV3ChapterTitle').select();
    toast('New chapter created.');
  }

  async function moveChapterStep(chapter, direction) {
    if (!chapter || isLockedStory(state.story)) return;
    await flushSave();
    const { error } = await db.rpc('move_chapter', { p_chapter_id: chapter.id, p_direction: direction });
    if (error) return toast(error.message || 'Could not reorder chapter.');
    await loadChapters(chapter.id);
  }

  async function moveChapterTo(fromId, targetId) {
    if (!fromId || !targetId || fromId === targetId || isLockedStory(state.story)) return;
    const fromIndex = state.chapters.findIndex((c) => c.id === fromId);
    const targetIndex = state.chapters.findIndex((c) => c.id === targetId);
    if (fromIndex < 0 || targetIndex < 0) return;
    await flushSave();
    const direction = targetIndex > fromIndex ? 1 : -1;
    const steps = Math.abs(targetIndex - fromIndex);
    for (let i = 0; i < steps; i += 1) {
      const { error } = await db.rpc('move_chapter', { p_chapter_id: fromId, p_direction: direction });
      if (error) { toast(error.message || 'Could not reorder chapter.'); break; }
    }
    await loadChapters(fromId);
  }

  function updateChapterStats() {
    const count = state.chapter ? words(editorPlainText()) : 0;
    const minutes = count ? Math.max(1, Math.ceil(count / READING_WPM)) : 0;
    ['studioV3ChapterWords','studioV3SideWords'].forEach((id) => { if ($(id)) $(id).textContent = formatNumber(count); });
    if ($('studioV3SideRead')) $('studioV3SideRead').textContent = `${minutes}m`;
    if ($('studioV3SidePosition')) $('studioV3SidePosition').textContent = state.chapter?.position || '—';
  }

  function projectedProjectWords() {
    return state.chapters.reduce((sum, chapter) => {
      if (state.chapter?.id === chapter.id && state.dirty) return sum + words(editorPlainText());
      return sum + words(chapter.content);
    }, 0);
  }

  function updateProjectStats(projectDirty = false) {
    const total = projectedProjectWords();
    ['studioV3TotalWords','studioV3TotalWordsTop'].forEach((id) => { if ($(id)) $(id).textContent = formatNumber(total); });
    if ($('studioV3ProgressWords')) $('studioV3ProgressWords').textContent = `${formatNumber(total)} words`;
    if ($('studioV3ProgressPercent')) $('studioV3ProgressPercent').textContent = '—';
    const read = total ? Math.max(1, Math.ceil(total / READING_WPM)) : 0;
    if ($('studioV3ReadTime')) $('studioV3ReadTime').textContent = `${read} min`;
    if ($('studioV3Readability')) $('studioV3Readability').textContent = readabilityLabel(editorPlainText());
    if (!projectDirty) updateRelativeTimes();
  }

  function readabilityLabel(value) {
    const raw = text(value).trim();
    if (!raw) return '—';
    const sentences = raw.split(/[.!?]+(?:\s|$)/).filter((s) => s.trim()).length || 1;
    const avg = words(raw) / sentences;
    if (avg <= 18) return 'Good';
    if (avg <= 25) return 'Dense';
    return 'Very dense';
  }

  function updateRelativeTimes() {
    const date = state.chapter?.updated_at || state.story?.updated_at;
    if ($('studioV3LastEdited')) $('studioV3LastEdited').textContent = formatTime(date);
  }

  function toggleFocus() {
    state.focus = !state.focus;
    $('studioV3Root').classList.toggle('focus-mode', state.focus);
    document.body.classList.toggle('studio-v3-focus-body', state.focus);
    $('studioV3Focus').classList.toggle('active', state.focus);
    $('studioV3Focus').querySelector('span').textContent = state.focus ? 'Exit Focus' : 'Focus Mode';
    if (state.focus) closeMobileSheet();
    requestAnimationFrame(() => $('studioV3Editor').focus({ preventScroll: true }));
  }

  function toggleChapterPopover(anchor) {
    const pop = $('studioV3ChapterPopover');
    if (!state.chapter) return;
    const hidden = pop.classList.contains('hidden');
    pop.classList.toggle('hidden', !hidden);
    if (hidden) {
      const r = anchor.getBoundingClientRect();
      pop.style.top = `${Math.min(window.innerHeight - 130, r.bottom + 6)}px`;
      pop.style.left = `${Math.max(10, r.right - 210)}px`;
    }
  }
  function closePopoverOnOutside(event) {
    const pop = $('studioV3ChapterPopover');
    if (!pop || pop.classList.contains('hidden')) return;
    if (!event.target.closest('#studioV3ChapterPopover') && !event.target.closest('#studioV3ChapterMenu')) pop.classList.add('hidden');
  }

  function leftSection(section) {
    document.querySelectorAll('[data-v3-section]').forEach((b) => b.classList.toggle('active', b.dataset.v3Section === section));
    if (section === 'chapters') return;
    if (section === 'overview') {
      openMobileSheet('more', 'Overview');
      return;
    }
    toast(`${section[0].toUpperCase()}${section.slice(1)} arrives in the next planned Studio sprint.`);
  }

  function openMobileSheet(kind, forcedTitle = null) {
    if (window.innerWidth > 820 && !forcedTitle) {
      if (kind === 'chapters') $('studioV3Root').classList.remove('left-collapsed');
      else if (kind === 'tools') $('studioV3Root').classList.remove('right-collapsed');
      else toast(kind === 'notes' ? 'Notes arrive in Sprint 2.' : 'Use the project rail for more tools.');
      return;
    }
    const sheet = $('studioV3MobileSheet');
    const content = $('studioV3MobileContent');
    state.mobileSheet = kind;
    content.replaceChildren();
    let title = forcedTitle || 'Studio';
    if (kind === 'chapters') {
      title = 'Chapters';
      const clone = $('studioV3ChapterList').cloneNode(true);
      clone.id = '';
      clone.querySelectorAll('.studio-v3-chapter-open').forEach((b) => {
        const row = b.closest('.studio-v3-chapter-row');
        const id = row?.dataset.chapterId;
        b.onclick = () => { const chapter = state.chapters.find((c) => c.id === id); if (chapter) openChapter(chapter); };
      });
      clone.querySelectorAll('.v3-mini-button,.studio-v3-drag').forEach((b) => b.remove());
      const add = button('＋ New chapter', 'studio-v3-new-button');
      add.disabled = isLockedStory(state.story);
      add.onclick = createChapter;
      content.append(add, clone);
    } else if (kind === 'tools') {
      title = 'Story Tools';
      const clone = $('studioV3Right').querySelector('.studio-v3-tool-scroll').cloneNode(true);
      content.append(clone);
    } else if (kind === 'notes') {
      title = 'Notes';
      const card = document.createElement('div');
      card.className = 'studio-v3-mobile-placeholder';
      card.innerHTML = '<span class="eyebrow">Sprint 2</span><h3>Notes stay beside your manuscript.</h3><p>Project notes and chapter notes are already locked into the V3 specification and will be implemented next.</p>';
      content.append(card);
    } else {
      title = forcedTitle || 'Project';
      const card = document.createElement('div');
      card.className = 'studio-v3-mobile-more-list';
      [['Overview', `${formatNumber(projectedProjectWords())} words`],['Chapters', `${state.chapters.length} chapters`],['Notes','Sprint 2'],['Characters','Sprint 2'],['Places','Sprint 2'],['Drafts','Sprint 3'],['Trash','Sprint 3']].forEach(([name,detail]) => {
        const row = document.createElement('button'); row.type = 'button'; row.innerHTML = `<strong>${name}</strong><span>${detail}</span>`; content.append(row);
      });
    }
    $('studioV3MobileTitle').textContent = title;
    $('studioV3MobileEyebrow').textContent = state.story?.title || 'WriteLite Studio';
    sheet.classList.add('open');
    sheet.setAttribute('aria-hidden', 'false');
    $('studioV3MobileBackdrop').classList.remove('hidden');
  }

  function closeMobileSheet() {
    const sheet = $('studioV3MobileSheet');
    if (!sheet) return;
    sheet.classList.remove('open');
    sheet.setAttribute('aria-hidden', 'true');
    $('studioV3MobileBackdrop')?.classList.add('hidden');
    state.mobileSheet = null;
  }

  function bootRouteHooks() {
    document.querySelectorAll('[data-view="write"],[data-view-jump="write"]')?.forEach((b) => b.addEventListener('click', () => setTimeout(maybeOpenStudio, 80)));
    document.querySelectorAll('[data-view]:not([data-view="write"]),[data-view-jump]:not([data-view-jump="write"])')?.forEach((b) => b.addEventListener('click', () => setTimeout(() => { if (!isWriteViewActive()) closeStudio(false); }, 40)));
    window.addEventListener('hashchange', () => setTimeout(maybeOpenStudio, 60));
    db.auth.onAuthStateChange((_event, session) => {
      state.user = session?.user || null;
      setTimeout(maybeOpenStudio, 0);
    });
  }

  async function boot() {
    inject();
    bootRouteHooks();
    await refreshIdentity();
    if (isWriteViewActive() && state.user) await openStudio();
  }

  window.WriteLiteStudioV3 = {
    open: openStudio,
    close: exitStudio,
    flush: flushSave,
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
