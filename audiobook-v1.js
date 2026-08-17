/* WriteLite — narration/audio/TTS disabled.
 *
 * The generated browser speech-synthesis feature was removed after reader
 * feedback showed it was getting in the way of the normal reading experience.
 * This small cleanup script intentionally creates no audio controls and never
 * starts speech. It only removes any legacy player UI/progress left behind by
 * older versions of WriteLite.
 */
(() => {
  'use strict';

  // Stop any browser speech that may still be active from an older cached page.
  try {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  } catch (error) {
    console.warn('[WriteLite] Could not cancel legacy narration:', error);
  }

  // Remove any legacy audiobook controls or badges if they are present.
  const removeLegacyNarrationUI = () => {
    [
      '#audiobookPanelV1',
      '#audiobookStylesV1',
      '.audiobook-badge-v1',
      '.featured-audio-v1'
    ].forEach((selector) => {
      document.querySelectorAll(selector).forEach((element) => element.remove());
    });
  };

  removeLegacyNarrationUI();

  // Clear saved audiobook progress/settings from earlier versions.
  try {
    const keysToRemove = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key && key.startsWith('writelite-audiobook-v1:')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch (error) {
    console.warn('[WriteLite] Could not clear legacy narration settings:', error);
  }

  // Re-run once the page is fully ready in case an old DOM snapshot contained
  // the retired player markup.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', removeLegacyNarrationUI, { once: true });
  }

  console.info('[WriteLite] Generated narration/text-to-speech is disabled.');
})();
