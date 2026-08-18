(function () {
  'use strict';

  const cfg = window.APP_CONFIG || {};
  const storageBucket = cfg.storageBucket || 'site-media';

  const items = [
    { selector: '#homeImageFile', key: 'home_image_url', label: 'HOME 이미지 삭제' },
    { selector: '#profileImageFile', key: 'profile_image_url', label: 'PROFILE 이미지 삭제' },
    { selector: '#entryImageFile', key: 'entry_image_url', label: '첫 화면 이미지 삭제' },
    { selector: '#bgmFile', key: 'bgm_url', label: 'BGM 삭제' },
    { selector: '#clickFile', key: 'click_sound_url', label: '클릭음 삭제' },
    { selector: '#widgetTrackFile', key: 'widget_track_url', label: '위젯 음원 삭제' },
    { selector: '#widgetCoverFile', key: 'widget_cover_url', label: '앨범 커버 삭제' },
    { selector: '#cursorFile', key: 'cursor_url', label: '커서 이미지 삭제' },
    { selector: '#trailImageFile', key: 'trail_image_url', label: '잔상 이미지 삭제' }
  ];

  function installStyle() {
    if (document.getElementById('adminMediaDeleteStyle')) return;
    const style = document.createElement('style');
    style.id = 'adminMediaDeleteStyle';
    style.textContent = `
      .media-delete-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 34px;
        margin: 8px 0 14px;
        padding: 0 12px;
        border: 1px solid rgba(226, 184, 184, .34);
        border-radius: 3px;
        background: rgba(118, 54, 54, .16);
        color: #e7c9c9;
        font: inherit;
        font-size: 11px;
        cursor: pointer;
      }
      .media-delete-button:hover {
        border-color: rgba(238, 183, 183, .62);
        background: rgba(132, 59, 59, .26);
      }
      .key-audio-grid .media-delete-button {
        width: 100%;
        margin: 6px 0 0;
        min-height: 30px;
        padding: 0 7px;
        font-size: 10px;
      }
    `;
    document.head.append(style);
  }

  function setStatus(text) {
    const el = document.getElementById('saveStatus');
    if (el) el.textContent = text;
  }

  async function readSettings() {
    const { data, error } = await window.db
      .from('site_content')
      .select('settings_json')
      .eq('id', cfg.siteId || 1)
      .single();
    if (error) throw error;
    return { ...(data?.settings_json || {}) };
  }

  async function saveSettings(settings) {
    const { error } = await window.db
      .from('site_content')
      .update({ settings_json: settings, updated_at: new Date().toISOString() })
      .eq('id', cfg.siteId || 1);
    if (error) throw error;
  }

  async function removeStoragePath(path) {
    if (!path || /^https?:\/\//i.test(path) || path.startsWith('assets/')) return;
    const { error } = await window.db.storage.from(storageBucket).remove([path]);
    if (error) throw error;
  }

  async function deleteScalarSetting(key, label) {
    const settings = await readSettings();
    const path = settings[key] || '';
    if (!path) {
      alert('삭제할 업로드 파일이 없습니다.');
      return;
    }
    if (!confirm(`${label} 파일을 완전히 삭제할까요?`)) return;

    setStatus('파일 삭제 중…');
    await removeStoragePath(path);
    settings[key] = '';
    await saveSettings(settings);
    setStatus('삭제됨');
    setTimeout(() => location.reload(), 350);
  }

  async function deleteKeycapSound(key) {
    const settings = await readSettings();
    const sounds = { ...(settings.keycap_sounds || {}) };
    const path = sounds[key] || '';
    if (!path) {
      alert(`${key} 키에 삭제할 음원이 없습니다.`);
      return;
    }
    if (!confirm(`${key} 키 음원을 완전히 삭제할까요?`)) return;

    setStatus('파일 삭제 중…');
    await removeStoragePath(path);
    sounds[key] = '';
    settings.keycap_sounds = sounds;
    await saveSettings(settings);
    setStatus('삭제됨');
    setTimeout(() => location.reload(), 350);
  }

  function makeButton(text, handler, marker) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'media-delete-button';
    button.dataset.mediaDeleteFor = marker;
    button.textContent = text;
    button.addEventListener('click', async () => {
      try {
        await handler();
      } catch (error) {
        console.error(error);
        setStatus('삭제 실패');
        alert(`삭제에 실패했습니다.\n${error.message || error}`);
      }
    });
    return button;
  }

  function attachScalarButton(item) {
    const input = document.querySelector(item.selector);
    if (!input) return;
    const marker = item.key;
    if (document.querySelector(`[data-media-delete-for="${marker}"]`)) return;
    const button = makeButton(item.label, () => deleteScalarSetting(item.key, item.label), marker);
    const label = input.closest('label');
    if (label) label.insertAdjacentElement('afterend', button);
    else input.insertAdjacentElement('afterend', button);
  }

  function attachKeycapButtons() {
    document.querySelectorAll('.keycap-audio-file[data-key]').forEach(input => {
      const key = input.dataset.key;
      const marker = `keycap-${key}`;
      if (document.querySelector(`[data-media-delete-for="${marker}"]`)) return;
      const button = makeButton(`${key} 삭제`, () => deleteKeycapSound(key), marker);
      const label = input.closest('label');
      if (label) label.append(button);
    });
  }

  function attachAll() {
    if (!window.SUPABASE_CONFIGURED || !window.db) return;
    installStyle();
    items.forEach(attachScalarButton);
    attachKeycapButtons();
  }

  const observer = new MutationObserver(() => attachAll());
  observer.observe(document.documentElement, { subtree: true, childList: true });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachAll, { once: true });
  } else {
    attachAll();
  }
})();
