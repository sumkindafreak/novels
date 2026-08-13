(() => {
  'use strict';

  function enhanceReaderNavigation() {
    const chapterNav = document.getElementById('chapterNav');
    const readerChapter = document.getElementById('readerChapter');
    const nextButton = document.getElementById('nextChapter');
    if (!chapterNav || !readerChapter || !nextButton) return;

    nextButton.classList.add('reader-next-cta-v2');

    function sync() {
      const links = Array.from(chapterNav.querySelectorAll('.chapter-link'));
      if (!links.length) return;

      let activeIndex = links.findIndex(link => link.classList.contains('active'));
      if (activeIndex < 0) {
        const currentTitle = readerChapter.querySelector('h2')?.textContent?.trim();
        activeIndex = links.findIndex(link => link.textContent.trim() === currentTitle);
      }
      if (activeIndex < 0) activeIndex = 0;

      const nextLink = links[activeIndex + 1] || null;
      nextButton.replaceChildren();

      if (!nextLink) {
        const end = document.createElement('span');
        end.className = 'reader-next-end-v2';
        end.textContent = 'End of story';
        nextButton.append(end);
        nextButton.disabled = true;
        nextButton.setAttribute('aria-label', 'End of story');
        return;
      }

      const label = document.createElement('span');
      label.className = 'reader-next-label-v2';
      label.textContent = 'Next chapter';

      const title = document.createElement('strong');
      title.className = 'reader-next-title-v2';
      title.textContent = nextLink.textContent.trim();

      const arrow = document.createElement('span');
      arrow.className = 'reader-next-arrow-v2';
      arrow.setAttribute('aria-hidden', 'true');
      arrow.textContent = '→';

      nextButton.append(label, title, arrow);
      nextButton.disabled = false;
      nextButton.setAttribute('aria-label', `Next chapter: ${title.textContent}`);
    }

    const observer = new MutationObserver(() => requestAnimationFrame(sync));
    observer.observe(chapterNav, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    });
    observer.observe(readerChapter, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    nextButton.addEventListener('click', () => {
      setTimeout(sync, 0);
      setTimeout(sync, 80);
    });

    [0, 80, 250, 600, 1200].forEach(delay => setTimeout(sync, delay));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enhanceReaderNavigation, { once: true });
  } else {
    enhanceReaderNavigation();
  }
})();
