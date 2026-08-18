(function () {
  'use strict';

  const cfg = window.APP_CONFIG || {};
  let loadedOnce = false;
  let currentHomePath = '';
  let currentProfilePath = '';

  function makeUploadBlock(id, labelText, previewId) {
    const wrap = document.createElement('div');
    wrap.className = 'split-image-upload-block';
    wrap.innerHTML = `
      <label>${labelText}<input id="${id}" type="file" accept="image/*" /></label>
      <div id="${previewId}" class="file-preview image-preview"></div>
    `;
    return wrap;
  }

  function setPreview(id, path) {
    const root = document.getElementById(id);
    if (!root) return;
    root.innerHTML = '';
    const url = window.publicUrlForPath(path || '');
    if (!url) return;
    const img = document.createElement('img');
    img.src = url;
    img.alt = '미리보기';
    root.append(img);
  }

  function setStatus(text) {
    const status = document.getElementById('saveStatus');
    if (status) status.textContent = text;
  }

  async function uploadFile(file, folder) {
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
    const path = `${folder}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const { error } = await window.db.storage
      .from(cfg.storageBucket || 'site-media')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || undefined
      });
    if (error) throw error;
    return path;
  }

  async function removeStoragePath(path) {
    if (!path || /^https?:\/\//i.test(path) || path.startsWith('assets/')) return;
    const { error } = await window.db.storage
      .from(cfg.storageBucket || 'site-media')
      .remove([path]);
    if (error) console.warn('이전 이미지 파일 정리 실패:', error);
  }

  async function mergeAndSaveSplitSettings() {
    if (!window.SUPABASE_CONFIGURED || !window.db) return;
    const { data, error: readError } = await window.db
      .from('site_content')
      .select('settings_json')
      .eq('id', cfg.siteId || 1)
      .single();
    if (readError) throw readError;

    const settings = { ...(data?.settings_json || {}) };
    settings.home_image_url = currentHomePath || '';
    settings.profile_image_url = currentProfilePath || '';

    const { error } = await window.db
      .from('site_content')
      .update({ settings_json: settings, updated_at: new Date().toISOString() })
      .eq('id', cfg.siteId || 1);
    if (error) throw error;
  }

  async function bindUpload(inputId, previewId, key, folder) {
    const input = document.getElementById(inputId);
    if (!input || input.dataset.boundSplitImage === '1') return;
    input.dataset.boundSplitImage = '1';

    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      const oldPath = key === 'home_image_url' ? currentHomePath : currentProfilePath;
      try {
        setStatus('이미지 업로드 중…');
        const path = await uploadFile(file, folder);
        if (key === 'home_image_url') currentHomePath = path;
        if (key === 'profile_image_url') currentProfilePath = path;
        await mergeAndSaveSplitSettings();
        setPreview(previewId, path);
        await removeStoragePath(oldPath && oldPath !== path ? oldPath : '');
        setStatus('저장됨');
      } catch (error) {
        console.error(error);
        if (key === 'home_image_url') currentHomePath = oldPath;
        if (key === 'profile_image_url') currentProfilePath = oldPath;
        setStatus('업로드 실패');
        alert(`이미지 업로드에 실패했습니다.\n${error.message || error}`);
      } finally {
        input.value = '';
      }
    });
  }

  function bindSaveProtection() {
    const button = document.getElementById('saveAllButton');
    if (!button || button.dataset.splitImageProtected === '1') return;
    button.dataset.splitImageProtected = '1';
    button.addEventListener('click', () => {
      setTimeout(() => mergeAndSaveSplitSettings().catch(console.warn), 900);
      setTimeout(() => mergeAndSaveSplitSettings().catch(console.warn), 1800);
    }, true);
  }

  function removeSharedImageUi() {
    const oldInput = document.getElementById('characterImageFile');
    const oldLabel = oldInput?.closest('label');
    if (oldLabel) oldLabel.remove();
    const oldPreview = document.getElementById('characterImagePreview');
    if (oldPreview) oldPreview.remove();

    const hint = document.querySelector('[data-tab-panel="character"] .hint-card p');
    if (hint) hint.textContent = 'HOME 대표 이미지와 PROFILE 이미지는 각각 따로 업로드하고 관리합니다.';
  }

  function buildUi() {
    const characterPanel = document.querySelector('[data-tab-panel="character"] .admin-card');
    const profilePanel = document.querySelector('[data-tab-panel="profile"] .admin-card');
    if (!characterPanel || !profilePanel) return false;

    removeSharedImageUi();

    if (!document.getElementById('homeImageFile')) {
      const block = makeUploadBlock('homeImageFile', 'HOME 대표 이미지', 'homeImagePreview');
      characterPanel.append(block);
    }

    if (!document.getElementById('profileImageFile')) {
      const block = makeUploadBlock('profileImageFile', 'PROFILE 전신 이미지', 'profileImagePreview');
      const bioLabel = document.getElementById('profileBioInput')?.closest('label');
      profilePanel.insertBefore(block, bioLabel || profilePanel.firstChild);
    }

    bindUpload('homeImageFile', 'homeImagePreview', 'home_image_url', 'character/home');
    bindUpload('profileImageFile', 'profileImagePreview', 'profile_image_url', 'character/profile');
    bindSaveProtection();
    return true;
  }

  async function loadExisting() {
    if (!window.SUPABASE_CONFIGURED || !window.db) return;
    try {
      const { data, error } = await window.db
        .from('site_content')
        .select('settings_json')
        .eq('id', cfg.siteId || 1)
        .single();
      if (error) throw error;
      const settings = data?.settings_json || {};
      currentHomePath = settings.home_image_url || '';
      currentProfilePath = settings.profile_image_url || '';
      setPreview('homeImagePreview', currentHomePath);
      setPreview('profileImagePreview', currentProfilePath);
      loadedOnce = true;
    } catch (error) {
      console.warn('분리 이미지 설정을 불러오지 못했습니다.', error);
    }
  }

  async function activate() {
    if (!buildUi()) return;
    if (!loadedOnce) await loadExisting();
  }

  const app = document.getElementById('adminApp');
  if (app) {
    const observer = new MutationObserver(() => {
      if (!app.classList.contains('hidden')) activate();
    });
    observer.observe(app, { attributes: true, attributeFilter: ['class'] });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', activate, { once: true });
  } else {
    activate();
  }
})();
