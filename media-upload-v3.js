/* Novels Community — direct uploads for new story covers */
(() => {
  'use strict';

  const SUPABASE_URL = 'https://efftrxqdsrmyuaubjumh.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_C2qPiCHALCK9bvhFc8CpvA_Vc6tTGYo';
  const MEDIA_BUCKET = 'public-media';
  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });

  const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
  const maxBytes = 5 * 1024 * 1024;

  function toast(message) {
    const node = document.getElementById('toast');
    if (!node) return;
    node.textContent = message;
    node.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => node.classList.remove('show'), 3200);
  }

  function safeUrl(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    try {
      const url = new URL(raw);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch {
      return '';
    }
  }

  function preview(node, url) {
    if (!node) return;
    node.style.backgroundImage = url ? `url("${url.replace(/"/g, '')}")` : '';
    node.classList.toggle('has-image', !!url);
    node.innerHTML = url ? '' : '<span>No cover selected</span>';
  }

  async function uploadCover(file) {
    const { data: { session } } = await client.auth.getSession();
    const user = session?.user;
    if (!user) throw new Error('Sign in before uploading a cover.');
    if (!allowedTypes.has(file.type)) throw new Error('Use a JPG, PNG, WebP or GIF image.');
    if (file.size > maxBytes) throw new Error('Cover image must be 5 MB or smaller.');

    const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }[file.type] || 'img';
    const path = `${user.id}/new-story-cover-${Date.now()}.${ext}`;
    const { error } = await client.storage.from(MEDIA_BUCKET).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });
    if (error) throw error;
    return client.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
  }

  function injectStyles() {
    if (document.getElementById('mediaUploadV3Styles')) return;
    const style = document.createElement('style');
    style.id = 'mediaUploadV3Styles';
    style.textContent = `
      .create-cover-upload-v3{display:grid;grid-template-columns:140px 1fr;gap:18px;align-items:center;padding:16px;border:1px solid var(--border,rgba(255,255,255,.12));border-radius:16px;background:rgba(255,255,255,.025)}
      .create-cover-preview-v3{aspect-ratio:2/3;border-radius:12px;background:rgba(255,255,255,.05);background-size:cover;background-position:center;display:grid;place-items:center;text-align:center;color:var(--muted,#9aa3b2);font-size:.82rem;overflow:hidden}
      .create-cover-actions-v3{display:flex;flex-wrap:wrap;gap:10px;align-items:center}.create-cover-actions-v3 input[type=file]{display:none}
      .create-cover-copy-v3 p{margin:.35rem 0 .8rem}.create-cover-url-fallback-v3{opacity:.72}
      @media(max-width:640px){.create-cover-upload-v3{grid-template-columns:100px 1fr;gap:12px}}
    `;
    document.head.append(style);
  }

  function enhanceCreateStoryForm() {
    const form = document.getElementById('storyForm');
    const urlInput = document.getElementById('storyCover');
    if (!form || !urlInput || document.getElementById('storyCreateCoverFileV3')) return;

    injectStyles();
    const urlLabel = urlInput.closest('label');
    if (urlLabel) {
      urlLabel.classList.add('create-cover-url-fallback-v3');
      const textNode = Array.from(urlLabel.childNodes).find(node => node.nodeType === Node.TEXT_NODE);
      if (textNode) textNode.nodeValue = 'Cover image URL — optional fallback ';
    }

    const block = document.createElement('div');
    block.className = 'create-cover-upload-v3';
    block.innerHTML = `
      <div id="storyCreateCoverPreviewV3" class="create-cover-preview-v3"><span>No cover selected</span></div>
      <div class="create-cover-copy-v3">
        <strong>Story cover</strong>
        <p class="field-note">Upload directly from your phone or computer. JPG, PNG, WebP or GIF · max 5 MB.</p>
        <div class="create-cover-actions-v3">
          <label class="button secondary file-button">Upload cover<input id="storyCreateCoverFileV3" type="file" accept="image/jpeg,image/png,image/webp,image/gif" /></label>
          <button id="storyCreateCoverRemoveV3" class="button ghost" type="button">Remove</button>
        </div>
      </div>`;
    if (urlLabel) urlLabel.before(block); else form.insertBefore(block, form.lastElementChild);

    const fileInput = document.getElementById('storyCreateCoverFileV3');
    const removeButton = document.getElementById('storyCreateCoverRemoveV3');
    const previewNode = document.getElementById('storyCreateCoverPreviewV3');

    fileInput.addEventListener('change', async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      const localUrl = URL.createObjectURL(file);
      preview(previewNode, localUrl);
      const label = fileInput.closest('label');
      const oldLabel = label.firstChild?.textContent || 'Upload cover';
      try {
        label.classList.add('disabled');
        label.firstChild.textContent = 'Uploading…';
        const publicUrl = await uploadCover(file);
        urlInput.value = publicUrl;
        preview(previewNode, publicUrl);
        toast('Cover uploaded. It will be saved with your story.');
      } catch (error) {
        console.error(error);
        fileInput.value = '';
        urlInput.value = '';
        preview(previewNode, '');
        toast(error.message || 'Cover upload failed.');
      } finally {
        label.classList.remove('disabled');
        label.firstChild.textContent = oldLabel;
        URL.revokeObjectURL(localUrl);
      }
    });

    removeButton.addEventListener('click', () => {
      fileInput.value = '';
      urlInput.value = '';
      preview(previewNode, '');
      toast('Cover removed from this draft.');
    });

    urlInput.addEventListener('input', () => preview(previewNode, safeUrl(urlInput.value)));

    form.addEventListener('reset', () => setTimeout(() => preview(previewNode, ''), 0));
  }

  function boot() {
    enhanceCreateStoryForm();
    const observer = new MutationObserver(() => enhanceCreateStoryForm());
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
