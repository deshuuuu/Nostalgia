(function () {
  'use strict';

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const cfg = window.APP_CONFIG || {};
  let content = structuredClone(window.DEFAULT_SITE_CONTENT);
  let settings = content.settings_json;
  let gallery = [];
  let toastTimer = null;

  const loginScreen = $('#adminLogin');
  const adminApp = $('#adminApp');
  const loginForm = $('#loginForm');
  const loginMessage = $('#loginMessage');
  const saveStatus = $('#saveStatus');

  async function init() {
    bindTabs();
    bindStaticEvents();

    if (!window.SUPABASE_CONFIGURED) {
      loginMessage.textContent = '먼저 js/config.js에 Supabase URL, publishable/anon key, 관리자 이메일을 입력해야 합니다.';
      $('#adminPassword').disabled = true;
      loginForm.querySelector('button[type="submit"]').disabled = true;
      return;
    }

    const { data } = await window.db.auth.getSession();
    if (data?.session && await verifyAdmin()) {
      await enterAdmin();
    }
  }

  function bindStaticEvents() {
    loginForm.addEventListener('submit', handleLogin);
    $('#logoutButton').addEventListener('click', handleLogout);
    $('#saveAllButton').addEventListener('click', saveAll);
    $('#addProfileField').addEventListener('click', () => addProfileFieldRow({ label: '', value: '' }));
    $('#addStoryChapter').addEventListener('click', () => addStoryRow({ title: '', body: '' }));
    $('#uploadGalleryButton').addEventListener('click', uploadGalleryItem);
    $('#resetKeycapHtml').addEventListener('click', () => {
      $('#keycapHtmlInput').value = window.DEFAULT_KEYCAP_HTML;
      renderKeycapPreview();
      markDirty();
    });
    $('#keycapHtmlInput').addEventListener('input', () => { renderKeycapPreview(); markDirty(); });

    bindFileUpload('#characterImageFile', 'character', path => { content.character_image_url = path; setImagePreview('#characterImagePreview', path); });
    bindFileUpload('#entryImageFile', 'entry', path => { settings.entry_image_url = path; setImagePreview('#entryImagePreview', path); });
    bindFileUpload('#bgmFile', 'audio/bgm', path => { settings.bgm_url = path; setAudioPreview('#bgmPreview', path); });
    bindFileUpload('#clickFile', 'audio/click', path => { settings.click_sound_url = path; setAudioPreview('#clickPreview', path); });
    bindFileUpload('#widgetTrackFile', 'audio/widget', path => { settings.widget_track_url = path; setAudioPreview('#widgetTrackPreview', path); });
    bindFileUpload('#widgetCoverFile', 'music-cover', path => { settings.widget_cover_url = path; setImagePreview('#widgetCoverPreview', path); });
    bindFileUpload('#cursorFile', 'cursor', path => { settings.cursor_url = path; setImagePreview('#cursorPreview', path); });
    bindFileUpload('#trailImageFile', 'cursor-trail', path => { settings.trail_image_url = path; toast('잔상 이미지 업로드 완료. 저장을 눌러 적용하세요.', 'success'); });

    $$('.keycap-audio-file').forEach(input => {
      input.addEventListener('change', async () => {
        const file = input.files?.[0];
        if (!file) return;
        try {
          setBusy(`키캡 ${input.dataset.key} 업로드 중…`);
          const path = await uploadFile(file, `keycap/${input.dataset.key.toLowerCase()}`);
          settings.keycap_sounds = { ...(settings.keycap_sounds || {}), [input.dataset.key]: path };
          renderKeycapAudioStatus();
          markDirty();
          toast(`${input.dataset.key} 키 음원이 업로드되었습니다.`, 'success');
        } catch (error) { handleError(error); }
        finally { setReady(); input.value = ''; }
      });
    });

    const dirtySelectors = [
      '#characterNameInput','#taglineInput','#profileBioInput','#bgmTitleInput',
      '#bgmVolumeInput','#clickVolumeInput','#widgetTrackTitleInput','#widgetTrackArtistInput',
      '#widgetVolumeInput','#pauseBgmCheck','#cursorSizeInput','#cursorScaleInput',
      '#trailEnabledCheck','#trailStyleInput','#trailSpacingInput','#trailSizeInput','#trailFadeInput',
      '#clickParticlesCheck','#siteTitleInput','#enterLabelInput','#entryKickerInput','#entryNoteInput',
      '#accentColorInput','#backgroundColorInput'
    ];
    dirtySelectors.forEach(selector => {
      const el = $(selector);
      el?.addEventListener('input', () => { updateLiveLabels(); markDirty(); });
      el?.addEventListener('change', () => { updateLiveLabels(); markDirty(); });
    });
  }

  function bindTabs() {
    $$('#adminNav button').forEach(button => {
      button.addEventListener('click', () => {
        const tab = button.dataset.tab;
        $$('#adminNav button').forEach(b => b.classList.toggle('active', b === button));
        $$('.admin-tab').forEach(p => p.classList.toggle('active', p.dataset.tabPanel === tab));
        $('#currentTabTitle').textContent = button.textContent;
      });
    });
  }

  async function handleLogin(event) {
    event.preventDefault();
    loginMessage.textContent = '';
    const password = $('#adminPassword').value;
    if (!password) return;
    if (!cfg.adminEmail || cfg.adminEmail.includes('YOUR_ADMIN_EMAIL')) {
      loginMessage.textContent = 'js/config.js의 adminEmail을 먼저 설정하세요.';
      return;
    }

    try {
      loginForm.querySelector('button[type="submit"]').disabled = true;
      loginMessage.textContent = '확인 중…';
      const { error } = await window.db.auth.signInWithPassword({ email: cfg.adminEmail, password });
      if (error) throw error;
      if (!await verifyAdmin()) {
        await window.db.auth.signOut();
        throw new Error('로그인은 되었지만 site_admins에 등록된 관리자 계정이 아닙니다.');
      }
      $('#adminPassword').value = '';
      await enterAdmin();
    } catch (error) {
      loginMessage.textContent = humanError(error);
    } finally {
      loginForm.querySelector('button[type="submit"]').disabled = false;
    }
  }

  async function verifyAdmin() {
    try {
      const { data, error } = await window.db.rpc('is_site_admin');
      if (error) throw error;
      return data === true;
    } catch (error) {
      console.warn(error);
      return false;
    }
  }

  async function enterAdmin() {
    loginScreen.classList.add('hidden');
    adminApp.classList.remove('hidden');
    await loadData();
    populateForms();
  }

  async function handleLogout() {
    await window.db.auth.signOut();
    adminApp.classList.add('hidden');
    loginScreen.classList.remove('hidden');
    loginMessage.textContent = '로그아웃되었습니다.';
  }

  async function loadData() {
    setBusy('데이터 불러오는 중…');
    try {
      const [{ data: row, error: cError }, { data: gRows, error: gError }] = await Promise.all([
        window.db.from('site_content').select('*').eq('id', cfg.siteId || 1).single(),
        window.db.from('gallery_items').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: true })
      ]);
      if (cError) throw cError;
      if (gError) throw gError;
      content = mergeContent(row || {});
      settings = content.settings_json;
      gallery = gRows || [];
      setReady();
    } catch (error) {
      handleError(error);
      setReady();
    }
  }

  function mergeContent(row) {
    return {
      ...structuredClone(window.DEFAULT_SITE_CONTENT),
      ...row,
      profile_json: { ...window.DEFAULT_SITE_CONTENT.profile_json, ...(row.profile_json || {}) },
      story_json: Array.isArray(row.story_json) ? row.story_json : window.DEFAULT_SITE_CONTENT.story_json,
      settings_json: { ...window.DEFAULT_SITE_CONTENT.settings_json, ...(row.settings_json || {}) },
      keycap_html: row.keycap_html || window.DEFAULT_KEYCAP_HTML
    };
  }

  function populateForms() {
    $('#characterNameInput').value = content.character_name || '';
    $('#taglineInput').value = content.tagline || '';
    $('#profileBioInput').value = content.profile_json?.bio || '';
    setImagePreview('#characterImagePreview', content.character_image_url);

    $('#profileFieldsEditor').innerHTML = '';
    (content.profile_json?.fields || []).forEach(addProfileFieldRow);
    if (!(content.profile_json?.fields || []).length) addProfileFieldRow({ label: '', value: '' });

    $('#storyEditor').innerHTML = '';
    (content.story_json || []).forEach(addStoryRow);
    if (!(content.story_json || []).length) addStoryRow({ title: '', body: '' });

    $('#bgmTitleInput').value = settings.bgm_title || '';
    $('#bgmVolumeInput').value = settings.bgm_volume ?? .45;
    $('#clickVolumeInput').value = settings.click_volume ?? .55;
    setAudioPreview('#bgmPreview', settings.bgm_url);
    setAudioPreview('#clickPreview', settings.click_sound_url);

    $('#widgetTrackTitleInput').value = settings.widget_track_title || '';
    $('#widgetTrackArtistInput').value = settings.widget_track_artist || '';
    $('#widgetVolumeInput').value = settings.widget_volume ?? .7;
    $('#pauseBgmCheck').checked = settings.pause_bgm_on_widget_play !== false;
    setAudioPreview('#widgetTrackPreview', settings.widget_track_url);
    setImagePreview('#widgetCoverPreview', settings.widget_cover_url);

    $('#keycapHtmlInput').value = content.keycap_html || window.DEFAULT_KEYCAP_HTML;
    renderKeycapPreview();
    renderKeycapAudioStatus();

    $('#cursorSizeInput').value = settings.cursor_size ?? 34;
    $('#cursorScaleInput').value = settings.cursor_pressed_scale ?? .82;
    $('#trailEnabledCheck').checked = settings.trail_enabled !== false;
    $('#trailStyleInput').value = settings.trail_style || 'sparkle';
    $('#trailSpacingInput').value = settings.trail_spacing ?? 12;
    $('#trailSizeInput').value = settings.trail_size ?? 13;
    $('#trailFadeInput').value = settings.trail_fade_ms ?? 520;
    $('#clickParticlesCheck').checked = settings.click_particles !== false;
    setImagePreview('#cursorPreview', settings.cursor_url);

    $('#siteTitleInput').value = settings.site_title || '';
    $('#enterLabelInput').value = settings.enter_label || 'ENTER';
    $('#entryKickerInput').value = settings.entry_kicker || 'A MEMORY, KEPT QUIETLY.';
    $('#entryNoteInput').value = settings.entry_note || '브라우저 정책상 ENTER 이후 음악이 재생됩니다. (AI 제작 음악)';
    setImagePreview('#entryImagePreview', settings.entry_image_url || content.character_image_url);
    $('#accentColorInput').value = normalizeHex(settings.accent_color, '#d9d0a4');
    $('#backgroundColorInput').value = normalizeHex(settings.background_color, '#55564f');

    renderGalleryEditor();
    updateLiveLabels();
    setReady();
  }

  function addProfileFieldRow(item = {}) {
    const row = document.createElement('div');
    row.className = 'editor-row profile-field-row';
    row.innerHTML = `
      <input class="field-label" type="text" placeholder="항목명 (예: AGE)" value="${escapeAttr(item.label || '')}">
      <textarea class="field-value" rows="2" placeholder="내용">${escapeHtml(item.value || '')}</textarea>
      <button class="remove-button" type="button" title="삭제">×</button>`;
    $('.remove-button', row).addEventListener('click', () => { row.remove(); markDirty(); });
    $$('input,textarea', row).forEach(el => el.addEventListener('input', markDirty));
    $('#profileFieldsEditor').append(row);
  }

  function addStoryRow(item = {}) {
    const row = document.createElement('div');
    row.className = 'editor-row story-row';
    row.innerHTML = `
      <input class="story-title" type="text" placeholder="챕터 제목" value="${escapeAttr(item.title || '')}">
      <button class="remove-button" type="button" title="삭제">×</button>
      <textarea class="story-body" rows="9" placeholder="스토리 본문">${escapeHtml(item.body || '')}</textarea>`;
    $('.remove-button', row).addEventListener('click', () => { row.remove(); markDirty(); });
    $$('input,textarea', row).forEach(el => el.addEventListener('input', markDirty));
    $('#storyEditor').append(row);
  }

  function gatherForms() {
    content.character_name = $('#characterNameInput').value.trim() || 'CHARACTER';
    content.tagline = $('#taglineInput').value.trim();
    content.profile_json = {
      bio: $('#profileBioInput').value,
      fields: $$('.profile-field-row').map(row => ({
        label: $('.field-label', row).value.trim(),
        value: $('.field-value', row).value
      })).filter(item => item.label || item.value)
    };
    content.story_json = $$('.story-row').map(row => ({
      title: $('.story-title', row).value.trim(),
      body: $('.story-body', row).value
    })).filter(item => item.title || item.body);
    content.keycap_html = $('#keycapHtmlInput').value || window.DEFAULT_KEYCAP_HTML;

    settings = {
      ...settings,
      bgm_title: $('#bgmTitleInput').value.trim(),
      bgm_volume: num('#bgmVolumeInput', .45),
      click_volume: num('#clickVolumeInput', .55),
      widget_track_title: $('#widgetTrackTitleInput').value.trim(),
      widget_track_artist: $('#widgetTrackArtistInput').value.trim(),
      widget_volume: num('#widgetVolumeInput', .7),
      pause_bgm_on_widget_play: $('#pauseBgmCheck').checked,
      cursor_size: num('#cursorSizeInput', 34),
      cursor_pressed_scale: num('#cursorScaleInput', .82),
      trail_enabled: $('#trailEnabledCheck').checked,
      trail_style: $('#trailStyleInput').value,
      trail_spacing: num('#trailSpacingInput', 12),
      trail_size: num('#trailSizeInput', 13),
      trail_fade_ms: num('#trailFadeInput', 520),
      click_particles: $('#clickParticlesCheck').checked,
      site_title: $('#siteTitleInput').value.trim() || 'Character Home',
      enter_label: $('#enterLabelInput').value.trim() || 'ENTER',
      entry_kicker: $('#entryKickerInput').value.trim() || 'A MEMORY, KEPT QUIETLY.',
      entry_note: $('#entryNoteInput').value.trim() || '브라우저 정책상 ENTER 이후 음악이 재생됩니다. (AI 제작 음악)',
      accent_color: $('#accentColorInput').value,
      background_color: $('#backgroundColorInput').value
    };
    content.settings_json = settings;
  }

  async function saveAll() {
    gatherForms();
    setBusy('저장 중…');
    try {
      const payload = {
        character_name: content.character_name,
        tagline: content.tagline,
        character_image_url: content.character_image_url,
        profile_json: content.profile_json,
        story_json: content.story_json,
        settings_json: content.settings_json,
        keycap_html: content.keycap_html,
        updated_at: new Date().toISOString()
      };
      const { error } = await window.db.from('site_content').update(payload).eq('id', cfg.siteId || 1);
      if (error) throw error;
      saveStatus.textContent = '저장됨';
      toast('공개 사이트에 반영되었습니다.', 'success');
    } catch (error) {
      handleError(error);
    } finally {
      setTimeout(setReady, 700);
    }
  }

  function bindFileUpload(selector, folder, onSuccess) {
    const input = $(selector);
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        setBusy('파일 업로드 중…');
        const path = await uploadFile(file, folder);
        onSuccess(path, file);
        markDirty();
        toast('파일 업로드 완료. 전체 저장을 눌러 적용하세요.', 'success');
      } catch (error) {
        handleError(error);
      } finally {
        input.value = '';
        setReady();
      }
    });
  }

  async function uploadFile(file, folder) {
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
    const name = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const path = `${folder}/${name}`;
    const { error } = await window.db.storage.from(cfg.storageBucket || 'site-media').upload(path, file, {
      cacheControl: '3600', upsert: false, contentType: file.type || undefined
    });
    if (error) throw error;
    return path;
  }

  async function uploadGalleryItem() {
    const file = $('#galleryFile').files?.[0];
    if (!file) { toast('먼저 이미지를 선택하세요.', 'error'); return; }
    setBusy('갤러리 업로드 중…');
    try {
      const path = await uploadFile(file, 'gallery');
      const maxOrder = gallery.reduce((m, x) => Math.max(m, Number(x.sort_order) || 0), 0);
      const payload = {
        file_path: path,
        caption: $('#galleryCaption').value.trim(),
        alt_text: $('#galleryAlt').value.trim(),
        sort_order: maxOrder + 10
      };
      const { data, error } = await window.db.from('gallery_items').insert(payload).select().single();
      if (error) {
        await window.db.storage.from(cfg.storageBucket || 'site-media').remove([path]);
        throw error;
      }
      gallery.push(data);
      $('#galleryFile').value = '';
      $('#galleryCaption').value = '';
      $('#galleryAlt').value = '';
      renderGalleryEditor();
      toast('갤러리에 추가되었습니다.', 'success');
    } catch (error) { handleError(error); }
    finally { setReady(); }
  }

  function renderGalleryEditor() {
    const root = $('#galleryEditor');
    root.innerHTML = '';
    if (!gallery.length) {
      root.innerHTML = '<p class="muted">등록된 이미지가 없습니다.</p>';
      return;
    }
    gallery.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'gallery-admin-item';
      const img = document.createElement('img');
      img.src = window.publicUrlForPath(item.file_path);
      img.alt = item.alt_text || '';
      const info = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = item.caption || `IMAGE ${index + 1}`;
      const sub = document.createElement('span');
      sub.textContent = item.file_path;
      info.append(title, sub);
      const actions = document.createElement('div');
      actions.className = 'gallery-actions';
      const up = actionButton('↑', () => moveGallery(index, -1));
      const down = actionButton('↓', () => moveGallery(index, 1));
      const del = actionButton('삭제', () => deleteGallery(item));
      up.disabled = index === 0;
      down.disabled = index === gallery.length - 1;
      actions.append(up, down, del);
      row.append(img, info, actions);
      root.append(row);
    });
  }

  function actionButton(text, fn) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'move-button'; b.textContent = text; b.addEventListener('click', fn); return b;
  }

  async function moveGallery(index, delta) {
    const next = index + delta;
    if (next < 0 || next >= gallery.length) return;
    [gallery[index], gallery[next]] = [gallery[next], gallery[index]];
    gallery.forEach((item, i) => { item.sort_order = (i + 1) * 10; });
    renderGalleryEditor();
    setBusy('순서 저장 중…');
    try {
      for (const item of gallery) {
        const { error } = await window.db.from('gallery_items').update({ sort_order: item.sort_order }).eq('id', item.id);
        if (error) throw error;
      }
      toast('갤러리 순서가 저장되었습니다.', 'success');
    } catch (error) { handleError(error); await loadData(); renderGalleryEditor(); }
    finally { setReady(); }
  }

  async function deleteGallery(item) {
    if (!confirm('이 갤러리 이미지를 삭제할까요? 파일도 Storage에서 제거됩니다.')) return;
    setBusy('삭제 중…');
    try {
      const { error: dbError } = await window.db.from('gallery_items').delete().eq('id', item.id);
      if (dbError) throw dbError;
      const { error: storageError } = await window.db.storage.from(cfg.storageBucket || 'site-media').remove([item.file_path]);
      if (storageError) console.warn('DB는 삭제됐지만 Storage 삭제에 실패했습니다.', storageError);
      gallery = gallery.filter(x => x.id !== item.id);
      renderGalleryEditor();
      toast('삭제되었습니다.', 'success');
    } catch (error) { handleError(error); }
    finally { setReady(); }
  }

  function renderKeycapAudioStatus() {
    const root = $('#keycapAudioStatus');
    root.innerHTML = '';
    ['Z','X','C','V'].forEach(key => {
      const p = document.createElement('div');
      p.className = 'muted';
      p.textContent = `${key} : ${settings.keycap_sounds?.[key] ? '업로드됨' : '미설정'}`;
      root.append(p);
    });
  }

  function renderKeycapPreview() {
    const host = $('#keycapHtmlPreview');
    const root = host.shadowRoot || host.attachShadow({ mode: 'open' });
    root.innerHTML = sanitizeKeycapHtml($('#keycapHtmlInput').value || window.DEFAULT_KEYCAP_HTML);
  }

  function sanitizeKeycapHtml(html) {
    const doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
    doc.querySelectorAll('script,iframe,object,embed,link,meta,base,form').forEach(el => el.remove());
    doc.querySelectorAll('*').forEach(el => {
      [...el.attributes].forEach(attr => {
        if (attr.name.toLowerCase().startsWith('on') || /^javascript:/i.test(attr.value.trim())) el.removeAttribute(attr.name);
      });
    });
    doc.querySelectorAll('style').forEach(style => {
      style.textContent = style.textContent.replace(/@import[^;]+;/gi, '').replace(/url\s*\(\s*['"]?javascript:[^)]+\)/gi, 'none');
    });
    return `${[...doc.head.querySelectorAll('style')].map(x => x.outerHTML).join('')}${doc.body.innerHTML}`;
  }

  function setImagePreview(selector, path) {
    const root = $(selector); root.innerHTML = '';
    const url = window.publicUrlForPath(path || '');
    if (!url) { root.textContent = '업로드된 이미지 없음'; return; }
    const img = document.createElement('img'); img.src = url; img.alt = 'Preview'; root.append(img);
  }

  function setAudioPreview(selector, path) {
    const root = $(selector); root.innerHTML = '';
    const url = window.publicUrlForPath(path || '');
    if (!url) { root.textContent = '업로드된 음원 없음'; return; }
    const audio = document.createElement('audio'); audio.controls = true; audio.preload = 'metadata'; audio.src = url; audio.style.width = '100%'; root.append(audio);
  }

  function updateLiveLabels() {
    $('#bgmVolumeLabel').textContent = `${Math.round(num('#bgmVolumeInput', .45) * 100)}%`;
    $('#clickVolumeLabel').textContent = `${Math.round(num('#clickVolumeInput', .55) * 100)}%`;
    $('#widgetVolumeLabel').textContent = `${Math.round(num('#widgetVolumeInput', .7) * 100)}%`;
  }

  function setBusy(text) { saveStatus.textContent = text; $('#saveAllButton').disabled = true; }
  function setReady() { saveStatus.textContent = '준비됨'; $('#saveAllButton').disabled = false; }
  function markDirty() { saveStatus.textContent = '저장 필요'; }
  function toast(message, type = '') {
    const el = $('#toast');
    el.textContent = message;
    el.className = `toast show ${type}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.className = 'toast'; }, 2600);
  }
  function handleError(error) { console.error(error); toast(humanError(error), 'error'); }
  function humanError(error) { return error?.message || '오류가 발생했습니다.'; }
  function num(selector, fallback) { const n = Number($(selector).value); return Number.isFinite(n) ? n : fallback; }
  function normalizeHex(value, fallback) { return /^#[0-9a-f]{6}$/i.test(value || '') ? value : fallback; }
  function escapeHtml(value) { return String(value).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }
  function escapeAttr(value) { return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])); }

  init();
})();
