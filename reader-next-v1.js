(() => {
  'use strict';

  function initReaderNext() {
    const chapterNav = document.getElementById('chapterNav');
    const nextButton = document.getElementById('nextChapter');
    if (!chapterNav || !nextButton) return;

    nextButton.classList.add('reader-next-cta');

    function syncNextButton() {
      const links = Array.from(chapterNav.querySelectorAll('.chapter-link'));
      const activeIndex = links.findIndex(link => link.classList.contains('active'));
      const nextLink = activeIndex >= 0 ? links[activeIndex + 1] : null;

      nextButton.replaceChildren();

      if (!nextLink) {
        const end = document.createElement('span');
        end.className = 'reader-next-end';
        end.textContent = 'End of story';
        nextButton.append(end);
        nextButton.disabled = true;
        nextButton.setAttribute('aria-label', 'End of story');
        return;
      }

      const label = document.createElement('span');
      label.className = 'reader-next-label';
      label.textContent = 'Next chapter';

      const title = document.createElement('strong');
      title.className = 'reader-next-title';
      title.textContent = nextLink.textContent.trim();

      const arrow = document.createElement('span');
      arrow.className = 'reader-next-arrow';
      arrow.setAttribute('aria-hidden', 'true');
      arrow.textContent = '→';

      nextButton.append(label, title, arrow);
      nextButton.disabled = false;
      nextButton.setAttribute('aria-label', `Next chapter: ${title.textContent}`);
    }

    const observer = new MutationObserver(syncNextButton);
    observer.observe(chapterNav, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    });

    syncNextButton();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initReaderNext, { once: true });
  } else {
    initReaderNext();
  }
})();