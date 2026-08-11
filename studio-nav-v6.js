/* Novels Community — Writer Studio navigation V6 */
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);

  function installStyles() {
    if ($('studioNavV6Styles')) return;
    const style = document.createElement('style');
    style.id = 'studioNavV6Styles';
    style.textContent = `
      .writer-quick-v6{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:0 0 22px}
      .writer-quick-v6 button{min-height:74px;text-align:left;padding:14px 16px;border:1px solid var(--line,rgba(255,255,255,.1));border-radius:16px;background:var(--surface,#191f2d);color:var(--text,#f2f3f7);box-shadow:0 10px 30px rgba(0,0,0,.12)}
      .writer-quick-v6 button:hover{border-color:rgba(232,168,86,.45);transform:translateY(-1px)}
      .writer-quick-v6 strong{display:block;font-size:15px}.writer-quick-v6 small{display:block;margin-top:5px;color:var(--muted,#969eb0);line-height:1.35}
      #myStories .my-story-row{grid-template-columns:minmax(0,1fr) auto auto}
      .quick-edit-story-v6{white-space:nowrap}
      @media(max-width:680px){.writer-quick-v6{grid-template-columns:1fr}.writer-quick-v6 button{min-height:62px}#myStories .my-story-row{grid-template-columns:minmax(0,1fr) auto}.quick-edit-story-v6{grid-column:1/-1;width:100%}}
    `;
    document.head.append(style);
  }

  function scrollToTarget(id, tries = 0) {
    const node = $(id);
    if (node) {
      node.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return node;
    }
    if (tries < 25) setTimeout(() => scrollToTarget(id, tries + 1), 100);
    return null;
  }

  function openStoryEditor(title, tries = 0) {
    const manager = $('storyManagerV2');
    if (!manager) {
      if (tries < 25) setTimeout(() => openStoryEditor(title, tries + 1), 100);
      return;
    }

    manager.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const buttons = [...manager.querySelectorAll('.managed-story-button')];
    const match = buttons.find(button => button.querySelector('strong')?.textContent.trim() === title);
    if (match) {
      match.click();
      setTimeout(() => $('storyEditFormV2')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 120);
    } else if (tries < 25) {
      setTimeout(() => openStoryEditor(title, tries + 1), 100);
    }
  }

  function enhanceShelf() {
    const shelf = $('myStories');
    if (!shelf) return;

    shelf.querySelectorAll('.my-story-row').forEach(row => {
      if (row.querySelector('.quick-edit-story-v6')) return;
      const title = row.querySelector('h4')?.textContent.trim();
      if (!title) return;
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'button ghost quick-edit-story-v6';
      edit.textContent = 'Edit';
      edit.setAttribute('aria-label', `Edit ${title}`);
      edit.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        openStoryEditor(title);
      });
      row.append(edit);
    });
  }

  function injectQuickActions() {
    const studio = $('writerStudio');
    if (!studio || $('writerQuickV6')) return false;

    const bar = document.createElement('div');
    bar.id = 'writerQuickV6';
    bar.className = 'writer-quick-v6';
    bar.innerHTML = `
      <button id="quickNewStoryV6" type="button"><strong>＋ New story</strong><small>Create a new title and start from scratch.</small></button>
      <button id="quickEditStoriesV6" type="button"><strong>✎ Edit my stories</strong><small>Cover, title, summary, genre and publishing status.</small></button>
      <button id="quickChaptersV6" type="button"><strong>☰ Chapters</strong><small>Edit, reorder, preview or add chapters.</small></button>`;

    studio.prepend(bar);
    $('quickNewStoryV6').onclick = () => scrollToTarget('storyForm');
    $('quickEditStoriesV6').onclick = () => {
      const manager = scrollToTarget('storyManagerV2');
      if (manager) {
        const first = manager.querySelector('.managed-story-button');
        if (first) first.click();
      }
    };
    $('quickChaptersV6').onclick = () => scrollToTarget('chapterManagerLaunch');
    return true;
  }

  function boot() {
    installStyles();
    if (!injectQuickActions()) {
      setTimeout(boot, 80);
      return;
    }

    const shelf = $('myStories');
    if (shelf) {
      enhanceShelf();
      new MutationObserver(enhanceShelf).observe(shelf, { childList: true, subtree: true });
    }

    document.querySelectorAll('[data-view="write"],[data-view-jump="write"]').forEach(button => {
      button.addEventListener('click', () => setTimeout(() => {
        injectQuickActions();
        enhanceShelf();
      }, 120));
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
