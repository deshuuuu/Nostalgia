(function () {
  'use strict';

  const cfg = window.APP_CONFIG || {};
  let snapshot = { bio: '', fields: [] };
  let loaded = false;
  let edited = false;
  let restoring = false;
  let pollTimer = null;

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];

  function normalizeProfile(value) {
    return {
      bio: String(value?.bio || ''),
      fields: Array.isArray(value?.fields)
        ? value.fields.map(item => ({ label: String(item?.label || ''), value: String(item?.value || '') }))
        : []
    };
  }

  function hasSnapshotContent() {
    return Boolean(snapshot.bio.trim() || snapshot.fields.some(item => item.label.trim() || item.value.trim()));
  }

  function readUi() {
    const bio = $('#profileBioInput')?.value || '';
    const fields = $$('.profile-field-row').map(row => ({
      label: $('.field-label', row)?.value || '',
      value: $('.field-value', row)?.value || ''
    })).filter(item => item.label.trim() || item.value.trim());
    return normalizeProfile({ bio, fields });
  }

  function syncSnapshotFromUi() {
    if (restoring || !loaded) return;
    snapshot = readUi();
  }

  function uiLooksWiped() {
    if (!hasSnapshotContent()) return false;
    const current = readUi();
    if (snapshot.bio.trim() && !current.bio.trim()) return true;
    if (snapshot.fields.length > current.fields.length) return true;

    for (let i = 0; i < snapshot.fields.length; i += 1) {
      const wanted = snapshot.fields[i] || { label: '', value: '' };
      const now = current.fields[i] || { label: '', value: '' };
      if (wanted.label.trim() && !now.label.trim()) return true;
      if (wanted.value.trim() && !now.value.trim()) return true;
    }
    return false;
  }

  function makeRow(item) {
    const row = document.createElement('div');
    row.className = 'editor-row profile-field-row';

    const label = document.createElement('input');
    label.className = 'field-label';
    label.type = 'text';
    label.placeholder = '항목명 (예: AGE)';
    label.value = item.label || '';

    const value = document.createElement('textarea');
    value.className = 'field-value';
    value.rows = 2;
    value.placeholder = '내용';
    value.value = item.value || '';

    const remove = document.createElement('button');
    remove.className = 'remove-button';
    remove.type = 'button';
    remove.title = '삭제';
    remove.textContent = '×';

    [label, value].forEach(el => el.addEventListener('input', event => {
      if (restoring || !event.isTrusted) return;
      edited = true;
      snapshot = readUi();
      const status = $('#saveStatus');
      if (status) status.textContent = '저장 필요';
    }));
    remove.addEventListener('click', event => {
      if (!event.isTrusted) return;
      edited = true;
      row.remove();
      snapshot = readUi();
      const status = $('#saveStatus');
      if (status) status.textContent = '저장 필요';
    });

    row.append(label, value, remove);
    return row;
  }

  function restoreUi() {
    if (!loaded || restoring || !uiLooksWiped()) return;
    const bio = $('#profileBioInput');
    const editor = $('#profileFieldsEditor');
    if (!bio || !editor) return;

    restoring = true;
    bio.value = snapshot.bio;
    editor.innerHTML = '';
    snapshot.fields.forEach(item => editor.appendChild(makeRow(item)));
    if (!snapshot.fields.length) editor.appendChild(makeRow({ label: '', value: '' }));
    restoring = false;

    console.info('PROFILE 입력값이 보호된 초안 기준으로 복구되었습니다.');
  }

  async function loadSnapshot() {
    if (!window.db || !window.SUPABASE_CONFIGURED) return;
    try {
      const { data, error } = await window.db
        .from('site_content')
        .select('profile_json')
        .eq('id', cfg.siteId || 1)
        .single();
      if (error) throw error;
      snapshot = normalizeProfile(data?.profile_json);
      loaded = true;
      setTimeout(restoreUi, 80);
      setTimeout(restoreUi, 300);
      setTimeout(restoreUi, 900);
    } catch (error) {
      console.warn('PROFILE 보호용 기준 데이터를 불러오지 못했습니다.', error);
    }
  }

  function bindEditTracking() {
    const panel = document.querySelector('[data-tab-panel="profile"]');
    if (!panel || panel.dataset.profileGuardBound === '1') return;
    panel.dataset.profileGuardBound = '1';

    panel.addEventListener('input', event => {
      if (restoring || !event.isTrusted) return;
      if (!event.target.matches('#profileBioInput,.field-label,.field-value')) return;
      edited = true;
      snapshot = readUi();
    }, true);

    panel.addEventListener('click', event => {
      if (!event.isTrusted) return;
      if (!event.target.closest('#addProfileField,.remove-button')) return;
      edited = true;
      setTimeout(() => { if (!restoring) snapshot = readUi(); }, 0);
    }, true);

    document.querySelector('#adminNav [data-tab="profile"]')?.addEventListener('click', () => {
      setTimeout(restoreUi, 100);
    });
  }

  function watchProfileUi() {
    const editor = $('#profileFieldsEditor');
    const bio = $('#profileBioInput');
    if (!editor || !bio) return;

    const observer = new MutationObserver(() => {
      if (!restoring) setTimeout(restoreUi, 0);
    });
    observer.observe(editor, { childList: true, subtree: true });

    const app = $('#adminApp');
    if (app) {
      const appObserver = new MutationObserver(() => {
        if (!app.classList.contains('hidden') && loaded) setTimeout(restoreUi, 120);
      });
      appObserver.observe(app, { attributes: true, attributeFilter: ['class'] });
    }

    clearInterval(pollTimer);
    pollTimer = setInterval(() => {
      const appVisible = app && !app.classList.contains('hidden');
      if (appVisible && loaded && !restoring) restoreUi();
    }, 900);
  }

  function init() {
    bindEditTracking();
    watchProfileUi();
    const app = $('#adminApp');
    if (app && !app.classList.contains('hidden')) loadSnapshot();
    else if (app) {
      const loginObserver = new MutationObserver(() => {
        if (!app.classList.contains('hidden') && !loaded) loadSnapshot();
      });
      loginObserver.observe(app, { attributes: true, attributeFilter: ['class'] });
    }
  }

  window.nostalgiaProfileWasEdited = () => edited;
  window.nostalgiaProfileGuardSnapshot = () => normalizeProfile(snapshot);
  window.nostalgiaProfileMarkSaved = profile => {
    snapshot = normalizeProfile(profile);
    loaded = true;
    edited = false;
    setTimeout(restoreUi, 50);
  };
  window.nostalgiaProfileSyncDraft = syncSnapshotFromUi;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
