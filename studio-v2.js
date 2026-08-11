/* Novels Community — Writer Studio V2 enhancements */
(() => {
  'use strict';

  const SUPABASE_URL = 'https://efftrxqdsrmyuaubjumh.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_C2qPiCHALCK9bvhFc8CpvA_Vc6tTGYo';
  const MEDIA_BUCKET = 'public-media';

  const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });

  const $ = (id) => document.getElementById(id);
  const state = { user: null, profile: null, stories: [], selectedStory: null, injected: false };

  const text = (value) => value == null ? '' : String(value);
  function safeUrl(value) {
    const raw = text(value).trim();
    if (!raw) return '';
    try { const url = new URL(raw); return ['http:', 'https:'].includes(url.protocol) ? url.href : ''; }
    catch { return ''; }
  }
  function toast(message) {
    const node = $('toast'); if (!node) return;
    node.textContent = message; node.classList.add('show'); clearTimeout(toast.timer);
    toast.timer = setTimeout(() => node.classList.remove('show'), 3200);
  }
  function setBusy(button, busy, busyLabel='Saving…') {
    if (!button) return;
    if (busy) { button.dataset.originalLabel = button.textContent; button.textContent = busyLabel; button.disabled = true; }
    else { button.textContent = button.dataset.originalLabel || button.textContent; button.disabled = false; }
  }
  function initials(value) { return text(value).trim().split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase() || 'N'; }
  function formatDate(value) { return value ? new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',year:'numeric'}).format(new Date(value)) : ''; }

  function profilePanelMarkup() {
    return `<section class="panel v2-profile-panel" id="fullProfilePanel">
      <div class="panel-heading"><div><span class="eyebrow">Your public identity</span><h2>Full profile editor</h2></div><span class="studio-badge">Profile</span></div>
      <form id="fullProfileForm" class="stack-form">
        <div class="profile-media-grid">
          <div class="media-editor"><div id="avatarPreviewV2" class="media-preview avatar-preview">TB</div><div><strong>Profile photo</strong><p class="field-note">JPG, PNG, WebP or GIF · max 5 MB</p><label class="button secondary file-button">Choose photo<input id="avatarFileV2" type="file" accept="image/jpeg,image/png,image/webp,image/gif" /></label></div></div>
          <div class="media-editor banner-editor"><div id="bannerPreviewV2" class="media-preview banner-preview"><span>Profile banner</span></div><div><strong>Writer banner</strong><p class="field-note">A wide image works best.</p><label class="button secondary file-button">Choose banner<input id="bannerFileV2" type="file" accept="image/jpeg,image/png,image/webp,image/gif" /></label></div></div>
        </div>
        <div class="form-row"><label>Writer / pen name<input id="profileDisplayV2" maxlength="80" required /></label><label>Username<input id="profileUsernameV2" minlength="3" maxlength="30" pattern="[A-Za-z0-9_-]+" required /></label></div>
        <label>Tagline<input id="profileTaglineV2" maxlength="140" placeholder="Dark fiction, strange histories and stories with teeth." /></label>
        <label>Bio<textarea id="profileBioV2" maxlength="1200" rows="7" placeholder="Tell readers who you are, what you write, and what keeps you coming back to the page."></textarea></label>
        <div class="form-row"><label>Location<input id="profileLocationV2" maxlength="120" placeholder="South Wales, UK" /></label><label>Pronouns<input id="profilePronounsV2" maxlength="60" placeholder="Optional" /></label></div>
        <label>Genres / interests<input id="profileGenresV2" maxlength="240" placeholder="Gothic, thriller, horror, historical fiction" /></label>
        <div class="form-row"><label>Website<input id="profileWebsiteV2" type="url" placeholder="https://…" /></label><label>Account email<input id="profileEmailV2" type="email" readonly /></label></div>
        <div class="form-row social-row"><label>Instagram<input id="profileInstagramV2" type="url" placeholder="https://instagram.com/…" /></label><label>X / Twitter<input id="profileXV2" type="url" placeholder="https://x.com/…" /></label><label>Facebook<input id="profileFacebookV2" type="url" placeholder="https://facebook.com/…" /></label></div>
        <div class="editor-footer"><span id="profileMemberSinceV2" class="muted"></span><button class="button primary" type="submit">Save full profile</button></div>
      </form>
    </section>`;
  }

  function storyManagerMarkup() {
    return `<section class="panel v2-story-manager" id="storyManagerV2">
      <div class="panel-heading"><div><span class="eyebrow">Your published shelf</span><h2>Edit existing story</h2></div><span class="studio-badge">Story editor</span></div>
      <div class="story-manager-layout"><aside class="story-manager-list"><div id="storyManagerListV2" class="managed-story-list"></div></aside>
      <form id="storyEditFormV2" class="stack-form story-edit-form hidden"><input id="storyEditIdV2" type="hidden" />
        <div class="story-cover-editor"><div id="storyCoverPreviewV2" class="media-preview story-cover-preview"><span>No cover</span></div><div class="story-cover-controls"><strong>Story cover</strong><p class="field-note">Upload a cover from your device or paste an image URL.</p><label class="button secondary file-button">Upload cover<input id="storyCoverFileV2" type="file" accept="image/jpeg,image/png,image/webp,image/gif" /></label><button id="removeStoryCoverV2" class="button ghost" type="button">Remove cover</button></div></div>
        <label>Cover image URL<input id="storyCoverUrlV2" type="url" placeholder="https://…" /></label>
        <label>Title<input id="storyTitleV2" maxlength="160" required /></label>
        <label>Summary<textarea id="storySummaryV2" maxlength="1400" rows="6"></textarea></label>
        <div class="form-row"><label>Genre<input id="storyGenreV2" maxlength="60" /></label><label>Status<select id="storyStatusV2"><option value="draft">Draft</option><option value="published">Published</option></select></label></div>
        <label>Public story address<div class="copy-field"><input id="storyPublicUrlV2" readonly /><button id="copyStoryUrlV2" class="button ghost" type="button">Copy</button></div></label>
        <div id="versionControlledNoteV2" class="inline-notice hidden"><strong>Balance Due manuscript:</strong> the book text is version-controlled in GitHub, so this editor changes its public metadata, status and cover without overwriting the locked manuscript.</div>
        <div class="editor-footer"><button id="openStoryV2" class="button ghost" type="button">Open story</button><button class="button primary" type="submit">Save story changes</button></div>
      </form>
      <div id="storyEditorEmptyV2" class="empty-state"><h3>Select a story to edit.</h3><p>Your existing stories will appear here after you sign in.</p></div></div>
    </section>`;
  }

  function injectUI() {
    if (state.injected) return;
    const profileGrid=document.querySelector('#profileContent .profile-grid'); const writerStudio=$('writerStudio');
    if(!profileGrid||!writerStudio)return;
    const legacyProfilePanel=$('profileForm')?.closest('.panel'); if(legacyProfilePanel) legacyProfilePanel.classList.add('hidden');
    profileGrid.insertAdjacentHTML('afterbegin',profilePanelMarkup());
    const chapterPanel=writerStudio.querySelector('.chapter-editor-panel');
    if(chapterPanel) chapterPanel.insertAdjacentHTML('beforebegin',storyManagerMarkup()); else writerStudio.insertAdjacentHTML('beforeend',storyManagerMarkup());
    const profileHero=document.querySelector('#profileContent .profile-hero');
    if(profileHero){ profileHero.id='profileHeroV2'; const summary=profileHero.querySelector('.profile-summary'); if(summary&&!$('profileExtraV2')) summary.insertAdjacentHTML('beforeend','<div id="profileExtraV2" class="profile-extra"></div><div id="profileSocialLinksV2" class="profile-social-links"></div>'); }
    $('fullProfileForm').addEventListener('submit',saveProfile); $('storyEditFormV2').addEventListener('submit',saveStory);
    $('storyCoverFileV2').addEventListener('change',previewStoryCoverFile); $('avatarFileV2').addEventListener('change',()=>previewLocalFile($('avatarFileV2'),$('avatarPreviewV2'))); $('bannerFileV2').addEventListener('change',()=>previewLocalFile($('bannerFileV2'),$('bannerPreviewV2')));
    $('removeStoryCoverV2').addEventListener('click',removeStoryCover); $('copyStoryUrlV2').addEventListener('click',copyStoryUrl);
    $('openStoryV2').addEventListener('click',()=>{if(state.selectedStory) location.href=`${location.pathname}?story=${encodeURIComponent(state.selectedStory.slug)}#reader`;});
    $('storyCoverUrlV2').addEventListener('input',()=>setImagePreview($('storyCoverPreviewV2'),safeUrl($('storyCoverUrlV2').value),'No cover'));
    document.querySelectorAll('[data-view="profile"],[data-view-jump="profile"]').forEach(btn=>btn.addEventListener('click',()=>setTimeout(refreshProfileEditor,50)));
    document.querySelectorAll('[data-view="write"],[data-view-jump="write"]').forEach(btn=>btn.addEventListener('click',()=>setTimeout(refreshStoryManager,80)));
    db.auth.onAuthStateChange(async(_event,session)=>{state.user=session?.user||null;if(state.user) await Promise.all([refreshProfileEditor(),refreshStoryManager()]);else resetV2Editors();});
    state.injected=true;
  }

  function resetV2Editors(){state.profile=null;state.stories=[];state.selectedStory=null;$('storyManagerListV2')?.replaceChildren();$('storyEditFormV2')?.classList.add('hidden');$('storyEditorEmptyV2')?.classList.remove('hidden');}
  function setImagePreview(node,url,fallbackText){if(!node)return;node.style.backgroundImage=url?`url("${url.replace(/"/g,'')}")`:'';node.classList.toggle('has-image',!!url);node.textContent=url?'':fallbackText;}
  function previewLocalFile(input,preview){const file=input?.files?.[0];if(!file)return;setImagePreview(preview,URL.createObjectURL(file),preview===$('avatarPreviewV2')?initials(state.profile?.display_name):'No image');}
  function previewStoryCoverFile(){previewLocalFile($('storyCoverFileV2'),$('storyCoverPreviewV2'));}
  async function getSessionUser(){const {data:{session}}=await db.auth.getSession();state.user=session?.user||null;return state.user;}

  async function refreshProfileEditor(){
    const user=await getSessionUser();if(!user||!$('fullProfileForm'))return;
    const {data,error}=await db.from('profiles').select('*').eq('id',user.id).single();if(error){console.error(error);return toast('Could not load the full profile editor.');}state.profile=data;
    $('profileDisplayV2').value=data.display_name||'';$('profileUsernameV2').value=data.username||'';$('profileTaglineV2').value=data.tagline||'';$('profileBioV2').value=data.bio||'';$('profileLocationV2').value=data.location||'';$('profilePronounsV2').value=data.pronouns||'';$('profileGenresV2').value=data.genres||'';$('profileWebsiteV2').value=data.website_url||'';$('profileInstagramV2').value=data.instagram_url||'';$('profileXV2').value=data.x_url||'';$('profileFacebookV2').value=data.facebook_url||'';$('profileEmailV2').value=user.email||'';$('profileMemberSinceV2').textContent=data.created_at?`Member since ${formatDate(data.created_at)}`:'';
    setImagePreview($('avatarPreviewV2'),data.avatar_url,initials(data.display_name||data.username));setImagePreview($('bannerPreviewV2'),data.banner_url,'Profile banner');renderProfileHeroExtras(data);
  }

  function renderProfileHeroExtras(profile){
    const hero=$('profileHeroV2');if(hero){hero.style.setProperty('--profile-banner',profile.banner_url?`url("${profile.banner_url.replace(/"/g,'')}")`:'none');hero.classList.toggle('has-banner',!!profile.banner_url);}
    const extra=$('profileExtraV2');if(extra){extra.replaceChildren();const bits=[];if(profile.tagline)bits.push(profile.tagline);if(profile.location)bits.push(`📍 ${profile.location}`);if(profile.pronouns)bits.push(profile.pronouns);if(profile.genres)bits.push(`Writes: ${profile.genres}`);bits.forEach(value=>{const span=document.createElement('span');span.textContent=value;extra.append(span);});}
    const socials=$('profileSocialLinksV2');if(socials){socials.replaceChildren();[['Website',safeUrl(profile.website_url)],['Instagram',safeUrl(profile.instagram_url)],['X',safeUrl(profile.x_url)],['Facebook',safeUrl(profile.facebook_url)]].filter(([,url])=>url).forEach(([label,url])=>{const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=label;socials.append(a);});}
  }

  async function uploadImage(file,kind){
    if(!state.user||!file)return null;if(file.size>5*1024*1024)throw new Error('Image must be 5 MB or smaller.');if(!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type))throw new Error('Please use a JPG, PNG, WebP or GIF image.');
    const extMap={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'};const path=`${state.user.id}/${kind}-${Date.now()}.${extMap[file.type]||'img'}`;
    const {error}=await db.storage.from(MEDIA_BUCKET).upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type});if(error)throw error;return db.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
  }

  async function saveProfile(event){
    event.preventDefault();const user=await getSessionUser();if(!user)return toast('Sign in to edit your profile.');const button=event.submitter;setBusy(button,true,'Saving profile…');
    try{
      let avatarUrl=state.profile?.avatar_url||null,bannerUrl=state.profile?.banner_url||null;const avatarFile=$('avatarFileV2').files?.[0],bannerFile=$('bannerFileV2').files?.[0];if(avatarFile)avatarUrl=await uploadImage(avatarFile,'avatar');if(bannerFile)bannerUrl=await uploadImage(bannerFile,'banner');
      const username=$('profileUsernameV2').value.trim();if(!/^[A-Za-z0-9_-]{3,30}$/.test(username))throw new Error('Username must be 3–30 characters using letters, numbers, _ or -.');
      const payload={username,display_name:$('profileDisplayV2').value.trim(),tagline:$('profileTaglineV2').value.trim(),bio:$('profileBioV2').value.trim(),location:$('profileLocationV2').value.trim(),pronouns:$('profilePronounsV2').value.trim(),genres:$('profileGenresV2').value.trim(),website_url:safeUrl($('profileWebsiteV2').value)||null,instagram_url:safeUrl($('profileInstagramV2').value)||null,x_url:safeUrl($('profileXV2').value)||null,facebook_url:safeUrl($('profileFacebookV2').value)||null,avatar_url:avatarUrl,banner_url:bannerUrl,updated_at:new Date().toISOString()};if(!payload.display_name)throw new Error('Writer / pen name cannot be blank.');
      const {data,error}=await db.from('profiles').update(payload).eq('id',user.id).select().single();if(error)throw error;state.profile=data;renderProfileHeroExtras(data);setImagePreview($('avatarPreviewV2'),data.avatar_url,initials(data.display_name||data.username));setImagePreview($('bannerPreviewV2'),data.banner_url,'Profile banner');
      if($('profileDisplayName'))$('profileDisplayName').textContent=data.display_name||data.username;if($('profileUsername'))$('profileUsername').textContent=`@${data.username}`;if($('profileBio'))$('profileBio').textContent=data.bio||'No bio yet.';if($('profileAvatar')){$('profileAvatar').textContent=data.avatar_url?'':initials(data.display_name||data.username);$('profileAvatar').style.backgroundImage=data.avatar_url?`url("${data.avatar_url.replace(/"/g,'')}")`:'';}
      await db.from('stories').update({author_name:data.display_name,updated_at:new Date().toISOString()}).eq('owner_id',user.id);$('avatarFileV2').value='';$('bannerFileV2').value='';toast('Full profile saved.');
    }catch(error){console.error(error);toast(error.message||'Profile could not be saved.');}finally{setBusy(button,false);}
  }

  async function refreshStoryManager(preferredId=null){const user=await getSessionUser();if(!user||!$('storyManagerListV2'))return;const {data,error}=await db.from('stories').select('*').eq('owner_id',user.id).order('updated_at',{ascending:false});if(error){console.error(error);return toast('Could not load your editable stories.');}state.stories=data||[];renderStoryList(preferredId||state.selectedStory?.id);}
  function renderStoryList(preferredId=null){
    const list=$('storyManagerListV2');list.replaceChildren();if(!state.stories.length){const p=document.createElement('p');p.className='muted';p.textContent='Create your first story above and it will appear here.';list.append(p);state.selectedStory=null;$('storyEditFormV2').classList.add('hidden');$('storyEditorEmptyV2').classList.remove('hidden');return;}
    state.stories.forEach(story=>{const button=document.createElement('button');button.type='button';button.className='managed-story-button';const thumb=document.createElement('span');thumb.className='managed-story-thumb';if(story.cover_url)thumb.style.backgroundImage=`url("${story.cover_url.replace(/"/g,'')}")`;else thumb.textContent=initials(story.title);const copy=document.createElement('span');copy.className='managed-story-copy';const title=document.createElement('strong');title.textContent=story.title;const meta=document.createElement('small');meta.textContent=`${story.status} · updated ${formatDate(story.updated_at)}`;copy.append(title,meta);button.append(thumb,copy);button.addEventListener('click',()=>selectStory(story.id));list.append(button);});
    const targetId=preferredId&&state.stories.some(s=>s.id===preferredId)?preferredId:state.stories[0].id;selectStory(targetId);
  }
  function selectStory(id){const story=state.stories.find(s=>s.id===id);if(!story)return;state.selectedStory=story;document.querySelectorAll('.managed-story-button').forEach((button,index)=>button.classList.toggle('active',state.stories[index]?.id===story.id));$('storyEditorEmptyV2').classList.add('hidden');$('storyEditFormV2').classList.remove('hidden');$('storyEditIdV2').value=story.id;$('storyTitleV2').value=story.title||'';$('storySummaryV2').value=story.summary||'';$('storyGenreV2').value=story.genre||'';$('storyStatusV2').value=story.status||'draft';$('storyCoverUrlV2').value=story.cover_url||'';$('storyPublicUrlV2').value=`${location.origin}${location.pathname}?story=${encodeURIComponent(story.slug)}#reader`;$('versionControlledNoteV2').classList.toggle('hidden',story.slug!=='balance-due');setImagePreview($('storyCoverPreviewV2'),story.cover_url,'No cover');$('storyCoverFileV2').value='';$('removeStoryCoverV2').dataset.remove='false';}
  function removeStoryCover(){$('storyCoverUrlV2').value='';$('storyCoverFileV2').value='';$('removeStoryCoverV2').dataset.remove='true';setImagePreview($('storyCoverPreviewV2'),'','No cover');}
  async function copyStoryUrl(){const value=$('storyPublicUrlV2').value;try{await navigator.clipboard.writeText(value);toast('Story link copied.');}catch{$('storyPublicUrlV2').select();document.execCommand('copy');toast('Story link copied.');}}

  async function saveStory(event){
    event.preventDefault();const user=await getSessionUser();if(!user||!state.selectedStory)return toast('Select a story first.');const button=event.submitter;setBusy(button,true,'Saving story…');
    try{
      let coverUrl=state.selectedStory.cover_url||null;const file=$('storyCoverFileV2').files?.[0],pastedUrl=safeUrl($('storyCoverUrlV2').value),removing=$('removeStoryCoverV2').dataset.remove==='true';if(removing)coverUrl=null;else if(file)coverUrl=await uploadImage(file,`story-${state.selectedStory.id}-cover`);else if(pastedUrl)coverUrl=pastedUrl;
      const status=$('storyStatusV2').value;const payload={title:$('storyTitleV2').value.trim(),summary:$('storySummaryV2').value.trim(),genre:$('storyGenreV2').value.trim()||'Other',status,cover_url:coverUrl,author_name:state.profile?.display_name||state.selectedStory.author_name||'Writer',published_at:status==='published'?(state.selectedStory.published_at||new Date().toISOString()):state.selectedStory.published_at,updated_at:new Date().toISOString()};if(!payload.title)throw new Error('Story title cannot be blank.');
      const {data,error}=await db.from('stories').update(payload).eq('id',state.selectedStory.id).eq('owner_id',user.id).select().single();if(error)throw error;state.selectedStory=data;$('storyCoverFileV2').value='';$('removeStoryCoverV2').dataset.remove='false';toast('Story changes saved.');await refreshStoryManager(data.id);setTimeout(()=>{history.replaceState(null,'',`${location.pathname}#write`);location.reload();},550);
    }catch(error){console.error(error);toast(error.message||'Story could not be saved.');}finally{setBusy(button,false);}
  }

  async function bootV2(){injectUI();if(!state.injected){setTimeout(bootV2,100);return;}await getSessionUser();if(state.user)await Promise.all([refreshProfileEditor(),refreshStoryManager()]);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootV2);else bootV2();
})();