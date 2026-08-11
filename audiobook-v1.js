/* WriteLite — generated audiobook player (browser speech synthesis) */
(() => {
  'use strict';

  const SUPPORTED_STORIES = new Set(['balance-due', 'pencil-boy']);
  const STORAGE_PREFIX = 'writelite-audiobook-v1:';
  const synth = window.speechSynthesis;

  if (!synth || typeof window.SpeechSynthesisUtterance === 'undefined') {
    console.warn('Generated audiobook narration is not supported in this browser.');
    return;
  }

  const $ = (id) => document.getElementById(id);

  const state = {
    slug: '',
    chunks: [],
    chunkIndex: 0,
    voices: [],
    voiceURI: '',
    rate: 1,
    speaking: false,
    paused: false,
    generation: 0,
    autoplayNext: true,
    pendingAutoplay: false,
    pendingResume: false,
    saved: null,
    mounted: false,
  };

  function currentSlug() {
    return new URLSearchParams(location.search).get('story') || '';
  }

  function isSupportedStory() {
    return SUPPORTED_STORIES.has(currentSlug());
  }

  function currentChapterIndex() {
    const links = [...document.querySelectorAll('#chapterNav .chapter-link')];
    return Math.max(0, links.findIndex(link => link.classList.contains('active')));
  }

  function currentChapterTitle() {
    return $('readerChapter')?.querySelector('h2')?.textContent?.trim() || 'Current chapter';
  }

  function storageKey(slug = currentSlug()) {
    return `${STORAGE_PREFIX}${slug}`;
  }

  function loadSaved(slug = currentSlug()) {
    try {
      const raw = localStorage.getItem(storageKey(slug));
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.warn('Could not load audiobook progress', error);
      return null;
    }
  }

  function saveProgress() {
    if (!state.slug || !SUPPORTED_STORIES.has(state.slug)) return;
    const payload = {
      chapterIndex: currentChapterIndex(),
      chapterTitle: currentChapterTitle(),
      chunkIndex: state.chunkIndex,
      rate: state.rate,
      voiceURI: state.voiceURI,
      autoplayNext: state.autoplayNext,
      updatedAt: new Date().toISOString(),
    };
    state.saved = payload;
    try {
      localStorage.setItem(storageKey(state.slug), JSON.stringify(payload));
    } catch (error) {
      console.warn('Could not save audiobook progress', error);
    }
    updateContinueButton();
  }

  function injectStyles() {
    if ($('audiobookStylesV1')) return;
    const style = document.createElement('style');
    style.id = 'audiobookStylesV1';
    style.textContent = `
      .audiobook-panel-v1{margin:14px 0 18px;padding:14px;border:1px solid rgba(255,255,255,.11);border-radius:16px;background:linear-gradient(145deg,rgba(143,124,255,.10),rgba(255,255,255,.025));box-shadow:0 14px 35px rgba(0,0,0,.14)}
      .audiobook-kicker-v1{display:flex;align-items:center;justify-content:space-between;gap:8px;color:#bba8ff;font-size:.72rem;font-weight:800;letter-spacing:.11em;text-transform:uppercase}.audiobook-kicker-v1 span:last-child{color:#9aa3b2;font-weight:600;letter-spacing:.03em;text-transform:none}
      .audiobook-title-v1{margin:8px 0 2px;font-size:1rem;line-height:1.25}.audiobook-status-v1{margin:0;color:#9aa3b2;font-size:.8rem;line-height:1.35}
      .audiobook-progress-v1{width:100%;margin:12px 0 8px;accent-color:#8f7cff}.audiobook-time-v1{display:flex;justify-content:space-between;color:#7f8899;font-size:.72rem;margin-top:-4px}
      .audiobook-main-controls-v1{display:grid;grid-template-columns:42px 1fr 42px;gap:8px;align-items:center;margin-top:10px}.audiobook-main-controls-v1 button{min-height:40px}.audiobook-play-v1{font-weight:800}
      .audiobook-settings-v1{display:grid;grid-template-columns:1fr 92px;gap:8px;margin-top:10px}.audiobook-settings-v1 select{width:100%;min-width:0;background:#10141d;color:#eef2f7;border:1px solid #343b4e;border-radius:10px;padding:8px;font:inherit;font-size:.78rem}
      .audiobook-options-v1{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:10px;flex-wrap:wrap}.audiobook-options-v1 label{display:flex;gap:6px;align-items:center;color:#9aa3b2;font-size:.76rem}.audiobook-continue-v1{width:100%;margin-top:9px;font-size:.78rem}
      .audiobook-badge-v1{position:absolute;left:10px;bottom:10px;z-index:2;padding:6px 9px;border-radius:99px;background:rgba(12,14,20,.88);border:1px solid rgba(187,168,255,.35);color:#d8ceff;font-size:.7rem;font-weight:800;letter-spacing:.02em;backdrop-filter:blur(5px)}.story-cover{position:relative}
      .featured-audio-v1{display:inline-flex;align-items:center;gap:6px;margin-top:8px;padding:6px 9px;border-radius:99px;background:rgba(143,124,255,.12);color:#cbbcff;font-size:.75rem;font-weight:700}
      @media(max-width:700px){.audiobook-panel-v1{margin-bottom:14px}.audiobook-settings-v1{grid-template-columns:1fr 84px}}
    `;
    document.head.append(style);
  }

  function injectPlayer() {
    injectStyles();
    const sidebar = document.querySelector('.reader-sidebar');
    const chapterNav = $('chapterNav');
    if (!sidebar || !chapterNav) return;

    let panel = $('audiobookPanelV1');
    if (!panel) {
      panel = document.createElement('section');
      panel.id = 'audiobookPanelV1';
      panel.className = 'audiobook-panel-v1 hidden';
      panel.setAttribute('aria-label', 'Generated audiobook player');
      panel.innerHTML = `
        <div class="audiobook-kicker-v1"><span>🎧 Listen</span><span>Generated narration</span></div>
        <h3 id="audiobookTitleV1" class="audiobook-title-v1">Current chapter</h3>
        <p id="audiobookStatusV1" class="audiobook-status-v1">Ready to listen</p>
        <input id="audiobookProgressV1" class="audiobook-progress-v1" type="range" min="0" max="100" value="0" aria-label="Narration progress" />
        <div class="audiobook-time-v1"><span id="audiobookProgressTextV1">0%</span><span id="audiobookChunkTextV1">Ready</span></div>
        <div class="audiobook-main-controls-v1">
          <button id="audiobookBackV1" class="button ghost" type="button" title="Previous passage" aria-label="Previous passage">↶</button>
          <button id="audiobookPlayV1" class="button primary audiobook-play-v1" type="button">▶ Play</button>
          <button id="audiobookForwardV1" class="button ghost" type="button" title="Next passage" aria-label="Next passage">↷</button>
        </div>
        <div class="audiobook-settings-v1">
          <select id="audiobookVoiceV1" aria-label="Narrator voice"></select>
          <select id="audiobookRateV1" aria-label="Playback speed">
            <option value="0.75">0.75×</option>
            <option value="1">1×</option>
            <option value="1.1">1.1×</option>
            <option value="1.25">1.25×</option>
            <option value="1.5">1.5×</option>
            <option value="1.75">1.75×</option>
            <option value="2">2×</option>
          </select>
        </div>
        <div class="audiobook-options-v1">
          <label><input id="audiobookAutoplayV1" type="checkbox" checked /> Auto-play next chapter</label>
          <button id="audiobookStopV1" class="button ghost" type="button">■ Stop</button>
        </div>
        <button id="audiobookContinueV1" class="button secondary audiobook-continue-v1 hidden" type="button"></button>
      `;
      sidebar.insertBefore(panel, chapterNav);

      $('audiobookPlayV1').addEventListener('click', togglePlayPause);
      $('audiobookStopV1').addEventListener('click', () => stopNarration(false));
      $('audiobookBackV1').addEventListener('click', () => seekChunk(-1));
      $('audiobookForwardV1').addEventListener('click', () => seekChunk(1));
      $('audiobookProgressV1').addEventListener('change', seekProgress);
      $('audiobookVoiceV1').addEventListener('change', onVoiceChange);
      $('audiobookRateV1').addEventListener('change', onRateChange);
      $('audiobookAutoplayV1').addEventListener('change', (event) => {
        state.autoplayNext = event.target.checked;
        saveProgress();
      });
      $('audiobookContinueV1').addEventListener('click', resumeSavedPosition);
    }
    state.mounted = true;
    panel.classList.toggle('hidden', !isSupportedStory());
  }

  function splitIntoSentences(text) {
    const clean = String(text || '').replace(/\s+/g, ' ').trim();
    if (!clean) return [];
    if (window.Intl?.Segmenter) {
      try {
        const segmenter = new Intl.Segmenter('en-GB', { granularity: 'sentence' });
        return [...segmenter.segment(clean)].map(segment => segment.segment.trim()).filter(Boolean);
      } catch (_) {}
    }
    return clean.split(/(?<=[.!?])\s+(?=[A-Z0-9“"'])/).map(part => part.trim()).filter(Boolean);
  }

  function buildChunks() {
    const chapter = $('readerChapter');
    if (!chapter) return [];
    const blocks = [...chapter.querySelectorAll('h2,p')]
      .map(node => node.textContent?.trim())
      .filter(Boolean);

    const sentences = blocks.flatMap(splitIntoSentences);
    const chunks = [];
    let buffer = '';
    const TARGET = 260;
    const HARD_MAX = 420;

    for (const sentence of sentences) {
      if (!buffer) {
        buffer = sentence;
        continue;
      }
      const candidate = `${buffer} ${sentence}`;
      if (candidate.length <= TARGET || (buffer.length < 120 && candidate.length <= HARD_MAX)) {
        buffer = candidate;
      } else {
        chunks.push(buffer);
        buffer = sentence;
      }
    }
    if (buffer) chunks.push(buffer);
    return chunks;
  }

  function refreshVoices() {
    state.voices = synth.getVoices() || [];
    const select = $('audiobookVoiceV1');
    if (!select) return;

    const previous = state.voiceURI || select.value || state.saved?.voiceURI || '';
    select.replaceChildren();

    const preferred = state.voices
      .filter(voice => /^en(-|_)/i.test(voice.lang))
      .sort((a, b) => {
        const aGB = /en-GB/i.test(a.lang) ? 0 : 1;
        const bGB = /en-GB/i.test(b.lang) ? 0 : 1;
        return aGB - bGB || a.name.localeCompare(b.name);
      });
    const remaining = state.voices.filter(voice => !preferred.includes(voice));
    [...preferred, ...remaining].forEach(voice => {
      const option = document.createElement('option');
      option.value = voice.voiceURI;
      option.textContent = `${voice.name} · ${voice.lang}`;
      select.append(option);
    });

    const match = state.voices.find(voice => voice.voiceURI === previous)
      || preferred[0]
      || state.voices[0];
    if (match) {
      state.voiceURI = match.voiceURI;
      select.value = match.voiceURI;
    }
  }

  function updateUI() {
    const panel = $('audiobookPanelV1');
    if (!panel) return;
    panel.classList.toggle('hidden', !isSupportedStory());
    if (!isSupportedStory()) return;

    $('audiobookTitleV1').textContent = currentChapterTitle();
    $('audiobookPlayV1').textContent = state.speaking ? (state.paused ? '▶ Resume' : '❚❚ Pause') : '▶ Play';
    $('audiobookStatusV1').textContent = state.speaking
      ? (state.paused ? 'Paused — your place is saved' : 'Narrating this chapter')
      : (state.chunks.length ? 'Ready — generated narration' : 'Waiting for chapter text');

    const total = Math.max(1, state.chunks.length);
    const pct = state.chunks.length ? Math.round((state.chunkIndex / total) * 100) : 0;
    $('audiobookProgressV1').value = Math.min(100, pct);
    $('audiobookProgressTextV1').textContent = `${Math.min(100, pct)}%`;
    $('audiobookChunkTextV1').textContent = state.chunks.length
      ? `Passage ${Math.min(state.chunkIndex + 1, total)} / ${total}`
      : 'Ready';
    $('audiobookRateV1').value = String(state.rate);
    $('audiobookAutoplayV1').checked = state.autoplayNext;
    if (state.voiceURI && $('audiobookVoiceV1').querySelector(`option[value="${CSS.escape(state.voiceURI)}"]`)) {
      $('audiobookVoiceV1').value = state.voiceURI;
    }
    updateContinueButton();
  }

  function updateContinueButton() {
    const button = $('audiobookContinueV1');
    if (!button || !state.saved || !isSupportedStory()) return button?.classList.add('hidden');
    const hasProgress = Number(state.saved.chapterIndex || 0) > 0 || Number(state.saved.chunkIndex || 0) > 0;
    const differs = Number(state.saved.chapterIndex || 0) !== currentChapterIndex() || Number(state.saved.chunkIndex || 0) > 0;
    if (!hasProgress || !differs) {
      button.classList.add('hidden');
      return;
    }
    button.textContent = `↻ Continue listening · ${state.saved.chapterTitle || `Chapter ${Number(state.saved.chapterIndex || 0) + 1}`}`;
    button.classList.remove('hidden');
  }

  function restoreSettings() {
    state.saved = loadSaved(state.slug);
    state.rate = Number(state.saved?.rate || 1);
    if (![0.75, 1, 1.1, 1.25, 1.5, 1.75, 2].includes(state.rate)) state.rate = 1;
    state.voiceURI = state.saved?.voiceURI || '';
    state.autoplayNext = state.saved?.autoplayNext !== false;
  }

  function refreshChapter({ preserveSaved = false } = {}) {
    const slug = currentSlug();
    const storyChanged = slug !== state.slug;
    if (storyChanged) {
      stopNarration(false);
      state.slug = slug;
      restoreSettings();
      refreshVoices();
    }

    if (!isSupportedStory()) {
      $('audiobookPanelV1')?.classList.add('hidden');
      return;
    }

    state.chunks = buildChunks();
    if (preserveSaved && state.saved?.chapterIndex === currentChapterIndex()) {
      state.chunkIndex = Math.min(Number(state.saved.chunkIndex || 0), Math.max(0, state.chunks.length - 1));
    } else if (!state.pendingResume && !state.pendingAutoplay) {
      state.chunkIndex = 0;
    }

    updateUI();

    if (state.pendingResume) {
      state.pendingResume = false;
      state.chunkIndex = Math.min(Number(state.saved?.chunkIndex || 0), Math.max(0, state.chunks.length - 1));
      speakFromCurrent();
    } else if (state.pendingAutoplay) {
      state.pendingAutoplay = false;
      state.chunkIndex = 0;
      speakFromCurrent();
    }
  }

  function selectedVoice() {
    return state.voices.find(voice => voice.voiceURI === state.voiceURI) || null;
  }

  function speakFromCurrent() {
    if (!state.chunks.length) return;
    state.generation += 1;
    state.speaking = true;
    state.paused = false;
    synth.cancel();
    speakChunk(state.generation);
    updateUI();
  }

  function speakChunk(generation) {
    if (generation !== state.generation || !state.speaking) return;
    if (state.chunkIndex >= state.chunks.length) {
      finishChapter();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(state.chunks[state.chunkIndex]);
    const voice = selectedVoice();
    if (voice) utterance.voice = voice;
    utterance.rate = state.rate;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onend = () => {
      if (generation !== state.generation || !state.speaking) return;
      state.chunkIndex += 1;
      saveProgress();
      updateUI();
      if (state.chunkIndex >= state.chunks.length) finishChapter();
      else speakChunk(generation);
    };

    utterance.onerror = (event) => {
      if (generation !== state.generation) return;
      if (['interrupted', 'canceled'].includes(event.error)) return;
      console.warn('Narration error', event.error);
      stopNarration(true);
      const status = $('audiobookStatusV1');
      if (status) status.textContent = 'Narration stopped — try another voice';
    };

    synth.speak(utterance);
  }

  function finishChapter() {
    state.speaking = false;
    state.paused = false;
    state.chunkIndex = state.chunks.length;
    saveProgress();
    updateUI();

    const next = $('nextChapter');
    if (state.autoplayNext && next && !next.disabled) {
      state.pendingAutoplay = true;
      next.click();
    } else {
      const status = $('audiobookStatusV1');
      if (status) status.textContent = 'Chapter complete';
    }
  }

  function togglePlayPause() {
    if (!isSupportedStory()) return;
    if (!state.chunks.length) refreshChapter({ preserveSaved: true });
    if (!state.chunks.length) return;

    if (!state.speaking) {
      if (state.chunkIndex >= state.chunks.length) state.chunkIndex = 0;
      speakFromCurrent();
      return;
    }

    if (state.paused) {
      synth.resume();
      state.paused = false;
    } else {
      synth.pause();
      state.paused = true;
      saveProgress();
    }
    updateUI();
  }

  function stopNarration(keepPosition = true) {
    state.generation += 1;
    synth.cancel();
    state.speaking = false;
    state.paused = false;
    if (keepPosition) saveProgress();
    updateUI();
  }

  function seekChunk(delta) {
    if (!state.chunks.length) return;
    const wasSpeaking = state.speaking;
    const nextIndex = Math.max(0, Math.min(state.chunks.length - 1, state.chunkIndex + delta));
    state.chunkIndex = nextIndex;
    state.generation += 1;
    synth.cancel();
    state.speaking = false;
    state.paused = false;
    saveProgress();
    updateUI();
    if (wasSpeaking) speakFromCurrent();
  }

  function seekProgress(event) {
    if (!state.chunks.length) return;
    const pct = Number(event.target.value || 0) / 100;
    const wasSpeaking = state.speaking;
    state.chunkIndex = Math.max(0, Math.min(state.chunks.length - 1, Math.floor(pct * state.chunks.length)));
    state.generation += 1;
    synth.cancel();
    state.speaking = false;
    state.paused = false;
    saveProgress();
    updateUI();
    if (wasSpeaking) speakFromCurrent();
  }

  function onVoiceChange(event) {
    state.voiceURI = event.target.value;
    const wasSpeaking = state.speaking;
    if (wasSpeaking) {
      state.generation += 1;
      synth.cancel();
      state.speaking = false;
      state.paused = false;
    }
    saveProgress();
    if (wasSpeaking) speakFromCurrent();
  }

  function onRateChange(event) {
    state.rate = Number(event.target.value || 1);
    const wasSpeaking = state.speaking;
    if (wasSpeaking) {
      state.generation += 1;
      synth.cancel();
      state.speaking = false;
      state.paused = false;
    }
    saveProgress();
    if (wasSpeaking) speakFromCurrent();
    else updateUI();
  }

  function resumeSavedPosition() {
    const saved = state.saved;
    if (!saved) return;
    const links = [...document.querySelectorAll('#chapterNav .chapter-link')];
    const chapterIndex = Math.max(0, Math.min(links.length - 1, Number(saved.chapterIndex || 0)));
    state.pendingResume = true;
    if (links[chapterIndex] && chapterIndex !== currentChapterIndex()) links[chapterIndex].click();
    else {
      state.chunkIndex = Math.min(Number(saved.chunkIndex || 0), Math.max(0, state.chunks.length - 1));
      state.pendingResume = false;
      speakFromCurrent();
    }
  }

  function decorateStoryCards() {
    injectStyles();
    document.querySelectorAll('.story-card').forEach(card => {
      if (card.querySelector('.audiobook-badge-v1')) return;
      const title = card.querySelector('h3')?.textContent?.trim().toLowerCase();
      if (!['balance due', 'pencil boy'].includes(title)) return;
      const cover = card.querySelector('.story-cover');
      if (!cover) return;
      const badge = document.createElement('span');
      badge.className = 'audiobook-badge-v1';
      badge.textContent = '🎧 Listen';
      cover.append(badge);
    });

    const featured = $('featuredStory');
    const featuredTitle = featured?.querySelector('h2')?.textContent?.trim().toLowerCase();
    if (featured && ['balance due', 'pencil boy'].includes(featuredTitle) && !featured.querySelector('.featured-audio-v1')) {
      const content = featured.querySelector('.featured-content');
      if (content) {
        const badge = document.createElement('span');
        badge.className = 'featured-audio-v1';
        badge.textContent = '🎧 Generated audiobook available';
        content.append(badge);
      }
    }
  }

  function observeReader() {
    const chapter = $('readerChapter');
    if (!chapter) return;
    let timer = null;
    new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => refreshChapter({ preserveSaved: false }), 60);
    }).observe(chapter, { childList: true, subtree: true, characterData: true });
  }

  function observeCards() {
    const grid = $('storyGrid');
    if (grid) new MutationObserver(decorateStoryCards).observe(grid, { childList: true, subtree: true });
    const featured = $('featuredStory');
    if (featured) new MutationObserver(decorateStoryCards).observe(featured, { childList: true, subtree: true });
  }

  function handleRouteChange() {
    injectPlayer();
    const slug = currentSlug();
    if (slug !== state.slug) {
      stopNarration(false);
      state.slug = slug;
      restoreSettings();
      refreshVoices();
    }
    setTimeout(() => refreshChapter({ preserveSaved: true }), 80);
    decorateStoryCards();
  }

  function boot() {
    injectPlayer();
    state.slug = currentSlug();
    restoreSettings();
    refreshVoices();
    synth.addEventListener?.('voiceschanged', refreshVoices);
    observeReader();
    observeCards();
    decorateStoryCards();
    refreshChapter({ preserveSaved: true });

    window.addEventListener('popstate', handleRouteChange);
    window.addEventListener('hashchange', handleRouteChange);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && state.speaking) saveProgress();
    });
    window.addEventListener('beforeunload', () => {
      if (state.speaking) saveProgress();
      synth.cancel();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
