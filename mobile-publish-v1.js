/* Writelite — mobile publish action V1
   Keeps the existing mobile navigation untouched and moves the publish CTA
   out from behind it into its own row beneath the main bar. */
(() => {
  'use strict';

  const MOBILE_BREAKPOINT = 820;
  const $ = (id) => document.getElementById(id);

  function installStyles() {
    if ($('mobilePublishV1Styles')) return;

    const style = document.createElement('style');
    style.id = 'mobilePublishV1Styles';
    style.textContent = `
      .mobile-publish-v1{display:none}

      @media(max-width:${MOBILE_BREAKPOINT}px){
        #newStoryButton{display:none!important}

        .mobile-publish-v1{
          display:block;
          padding:8px 16px 10px;
          background:rgba(14,17,24,.96);
          border-bottom:1px solid rgba(255,255,255,.08);
        }

        .mobile-publish-v1 button{
          width:100%;
          min-height:46px;
          border:1px solid transparent;
          border-radius:14px;
          padding:11px 16px;
          font:inherit;
          font-weight:800;
          color:#20170d;
          background:linear-gradient(135deg,var(--accent-2,#f1c986),var(--accent,#e8a856));
          box-shadow:0 8px 24px rgba(232,168,86,.16);
        }

        .mobile-publish-v1 button:active{transform:translateY(1px)}
      }
    `;
    document.head.append(style);
  }

  function installMobileAction() {
    const original = $('newStoryButton');
    const header = document.querySelector('.site-header');
    if (!original || !header || $('mobilePublishV1')) return;

    const row = document.createElement('div');
    row.id = 'mobilePublishV1';
    row.className = 'mobile-publish-v1';

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Publish a story';
    button.setAttribute('aria-label', 'Publish a story');
    button.addEventListener('click', () => original.click());

    row.append(button);
    header.insertAdjacentElement('afterend', row);
  }

  function boot() {
    installStyles();
    installMobileAction();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
