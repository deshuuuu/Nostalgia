(function () {
  'use strict';

  const cfg = window.APP_CONFIG || {};
  const bucket = cfg.storageBucket || 'site-media';

  const scalarTargets = [
    ['home_image_url', 'character/home', 'HOME 대표 이미지'],
    ['profile_image_url', 'character/profile', 'PROFILE 이미지'],
    ['entry_image_url', 'entry', '첫 화면 이미지'],
    ['bgm_url', 'audio/bgm', 'BGM'],
    ['click_sound_url', 'audio/click', '클릭음'],
    ['widget_track_url', 'audio/widget', '위젯 음원'],
    ['widget_cover_url', 'music-cover', '위젯 커버'],
    ['cursor_url', 'cursor', '커서 이미지'],
    ['trail_image_url', 'cursor-trail', '잔상 이미지']
  ];

  const keycapTargets = [
    ['Z', 'keycap/z'],
    ['X', 'keycap/x'],
    ['C', 'keycap/c'],
    ['V', 'keycap/v']
  ];

  function setStatus(text) {
    const el = document.getElementById('saveStatus');
    if (el) el.textContent = text;
  }

  async function latestFile(folder) {
    const { data, error } = await window.db.storage.from(bucket).list(folder, {
      limit: 100,
      offset: 0,
      sortBy: { column: 'created_at', order: 'desc' }
    });
    if (error) throw error;
    const files = (data || []).filter(item => item?.name && item.name !== '.emptyFolderPlaceholder' && (item.id || item.metadata));
    if (!files.length) return '';
    return `${folder}/${files[0].name}`;
  }

  async function recoverMissingMedia() {
    if (!window.db || !window.SUPABASE_CONFIGURED) return;
    if (!confirm('비어 있는 미디어 설정만 Storage의 가장 최근 업로드 파일로 복구할까요? 기존에 남아 있는 설정은 건드리지 않습니다.')) return;

    const button = document.getElementById('recoverMediaSettingsButton');
    if (button) button.disabled = true;
    setStatus('미디어 복구 검색 중…');

    try {
      const { data, error } = await window.db
        .from('site_content')
        .select('settings_json')
        .eq('id', cfg.siteId || 1)
        .single();
      if (error) throw error;

      const settings = { ...(data?.settings_json || {}) };
      const recovered = [];

      for (const [key, folder, label] of scalarTargets) {
        if (settings[key]) continue;
        const path = await latestFile(folder);
        if (!path) continue;
        settings[key] = path;
        recovered.push(`${label}: ${path}`);
      }

      const sounds = { ...(settings.keycap_sounds || {}) };
      for (const [key, folder] of keycapTargets) {
        if (sounds[key]) continue;
        const path = await latestFile(folder);
        if (!path) continue;
        sounds[key] = path;
        recovered.push(`키캡 ${key} 음원: ${path}`);
      }
      settings.keycap_sounds = sounds;

      if (!recovered.length) {
        setStatus('복구할 미디어 없음');
        alert('비어 있는 설정에 연결할 기존 업로드 파일을 찾지 못했습니다.');
        return;
      }

      const { error: saveError } = await window.db
        .from('site_content')
        .update({ settings_json: settings, updated_at: new Date().toISOString() })
        .eq('id', cfg.siteId || 1);
      if (saveError) throw saveError;

      setStatus('미디어 복구됨');
      alert(`다음 미디어 경로를 복구했습니다.\n\n${recovered.join('\n')}\n\n관리자 페이지를 새로고침합니다.`);
      location.reload();
    } catch (error) {
      console.error(error);
      setStatus('복구 실패');
      alert(`미디어 복구 중 오류가 발생했습니다.\n${error?.message || error}`);
    } finally {
      if (button) button.disabled = false;
    }
  }

  function injectUi() {
    if (!window.db || document.getElementById('adminRecoveryCard')) return;
    const sitePanel = document.querySelector('[data-tab-panel="site"] .panel-grid');
    if (!sitePanel) return;

    const card = document.createElement('article');
    card.id = 'adminRecoveryCard';
    card.className = 'admin-card';
    card.style.gridColumn = '1 / -1';
    card.innerHTML = `
      <h3>설정 복구 도구</h3>
      <p class="muted">설정 경로가 비어 있지만 Storage에 업로드 파일이 남아 있는 경우에만 사용합니다. 이미 값이 남아 있는 설정은 덮어쓰지 않습니다.</p>
      <button id="recoverMediaSettingsButton" class="secondary-button" type="button">비어 있는 미디어 경로 찾기 / 복구</button>`;
    sitePanel.append(card);
    document.getElementById('recoverMediaSettingsButton').addEventListener('click', recoverMissingMedia);
  }

  const observer = new MutationObserver(injectUi);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectUi, { once: true });
  } else {
    injectUi();
  }
})();