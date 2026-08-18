(function () {
  'use strict';

  const cfg = window.APP_CONFIG || {};
  const $ = (s, root = document) => root.querySelector(s);
  let initialized = false;
  let playlist = [];
  let volume = 0.7;
  let saveTimer = null;

  function uid() {
    return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function publicUrl(path) {
    if (!path) return '';
    return window.publicUrlForPath ? window.publicUrlForPath(path) : path;
  }

  function normalizeTrack(item, index) {
    return {
      id: item?.id || uid(),
      title: String(item?.title || `TRACK ${index + 1}`),
      artist: String(item?.artist || ''),
      audio_path: String(item?.audio_path || item?.audio || ''),
      cover_path: String(item?.cover_path || item?.cover || '')
    };
  }

  function migrateLegacy(settings) {
    const result = [];
    const seen = new Set();
    const add = (path, title, artist, cover) => {
      const p = String(path || '').trim();
      if (!p || seen.has(p)) return;
      seen.add(p);
      result.push({ id: uid(), title: title || `TRACK ${result.length + 1}`, artist: artist || '', audio_path: p, cover_path: cover || '' });
    };
    add(settings.bgm_url, settings.bgm_title || 'SITE THEME', '', '');
    add(settings.widget_track_url, settings.widget_track_title || 'THEME TRACK', settings.widget_track_artist || '', settings.widget_cover_url || '');
    return result;
  }

  async function fetchSettings() {
    const { data, error } = await window.db
      .from('site_content')
      .select('settings_json')
      .eq('id', cfg.siteId || 1)
      .single();
    if (error) throw error;
    return data?.settings_json || {};
  }

  async function persistPlaylist(showToast = false) {
    clearTimeout(saveTimer);
    const settings = await fetchSettings();
    const merged = {
      ...settings,
      music_playlist: playlist,
      music_playlist_volume: volume,
      bgm_url: '',
      widget_track_url: ''
    };
    const { error } = await window.db
      .from('site_content')
      .update({ settings_json: merged, updated_at: new Date().toISOString() })
      .eq('id', cfg.siteId || 1);
    if (error) throw error;
    const status = document.getElementById('saveStatus');
    if (status) status.textContent = '저장됨';
    if (showToast) toast('재생목록이 저장되었습니다.', 'success');
  }

  function scheduleSave(delay = 250) {
    clearTimeout(saveTimer);
    const status = document.getElementById('saveStatus');
    if (status) status.textContent = '재생목록 저장 중…';
    saveTimer = setTimeout(() => persistPlaylist(false).catch(handleError), delay);
  }

  function toast(message, type = '') {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = message;
    el.className = `toast show ${type}`;
    setTimeout(() => { el.className = 'toast'; }, 2400);
  }

  function handleError(error) {
    console.error(error);
    toast(error?.message || '재생목록 처리 중 오류가 발생했습니다.', 'error');
    const status = document.getElementById('saveStatus');
    if (status) status.textContent = '오류';
  }

  async function uploadFile(file, folder) {
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
    const path = `${folder}/${Date.now()}-${uid()}.${ext}`;
    const { error } = await window.db.storage.from(cfg.storageBucket || 'site-media').upload(path, file, {
      cacheControl: '3600', upsert: false, contentType: file.type || undefined
    });
    if (error) throw error;
    return path;
  }

  async function removeStoredFile(path) {
    if (!path || /^(https?:|data:|blob:)/i.test(path)) return;
    try { await window.db.storage.from(cfg.storageBucket || 'site-media').remove([path]); } catch (_) {}
  }

  function injectStyles() {
    if (document.getElementById('adminPlaylistStyles')) return;
    const style = document.createElement('style');
    style.id = 'adminPlaylistStyles';
    style.textContent = `
      #playlistManager{grid-column:1/-1}
      #playlistManager .pl-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:18px}
      #playlistManager .pl-tools{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
      #playlistManager .pl-volume{display:flex;align-items:center;gap:8px;font-size:11px;color:#b9b5a6}
      #playlistManager .pl-volume input{width:130px}
      #playlistManager .pl-list{display:flex;flex-direction:column;gap:12px}
      #playlistManager .pl-track{display:grid;grid-template-columns:74px minmax(0,1fr) auto;gap:14px;padding:14px;border:1px solid rgba(226,220,190,.20);background:rgba(255,255,255,.025)}
      #playlistManager .pl-cover{width:74px;height:74px;border:1px solid rgba(226,220,190,.22);background:rgba(255,255,255,.035);background-size:cover;background-position:center;display:grid;place-items:center;color:#8f8d83;font:700 18px Georgia,serif}
      #playlistManager .pl-fields{display:grid;grid-template-columns:1fr 1fr;gap:9px}
      #playlistManager .pl-fields label{margin:0;font-size:10px}
      #playlistManager .pl-fields .wide{grid-column:1/-1}
      #playlistManager .pl-actions{display:flex;flex-direction:column;gap:6px}
      #playlistManager .pl-actions button{min-width:46px}
      #playlistManager .pl-status{grid-column:1/-1;font-size:9px;color:#99978d;word-break:break-all}
      #playlistManager .pl-empty{padding:26px;border:1px dashed rgba(226,220,190,.18);text-align:center;color:#aaa79a;font-size:11px}
      #playlistManager .pl-note{margin:14px 0 0;padding:11px 13px;border-left:2px solid var(--accent,#d9d0a4);background:rgba(255,255,255,.025);color:#b9b5a6;font-size:10px;line-height:1.7}
      @media(max-width:800px){#playlistManager .pl-track{grid-template-columns:64px 1fr}.pl-actions{grid-column:1/-1!important;flex-direction:row!important}.pl-fields{grid-template-columns:1fr!important}}
    `;
    document.head.appendChild(style);
  }

  function buildManager(panel) {
    const grid = panel.querySelector('.panel-grid');
    if (!grid) return;
    [...grid.children].forEach(el => { el.style.display = 'none'; });

    const card = document.createElement('article');
    card.id = 'playlistManager';
    card.className = 'admin-card';
    card.innerHTML = `
      <div class="pl-head">
        <div>
          <h3 style="margin:0">뮤직 플레이어 / 사이트 BGM</h3>
          <p class="muted" style="margin:7px 0 0">재생목록의 첫 번째 곡이 ENTER 후 기본 BGM으로 재생됩니다.</p>
        </div>
        <div class="pl-tools">
          <label class="pl-volume">볼륨 <input id="playlistVolume" type="range" min="0" max="1" step="0.01"><span id="playlistVolumeLabel"></span></label>
          <button id="addPlaylistTrack" class="primary-button" type="button">+ 곡 추가</button>
        </div>
      </div>
      <div id="playlistTrackList" class="pl-list"></div>
      <p class="pl-note">각 곡마다 음원, 제목, 아티스트, 커버 이미지를 따로 등록할 수 있습니다. 공개 페이지의 LIST 버튼을 누르면 방문자가 원하는 곡을 직접 선택할 수 있습니다. 순서의 맨 위 곡이 사이트 기본 BGM입니다.</p>`;
    grid.prepend(card);

    const vol = document.getElementById('playlistVolume');
    vol.value = volume;
    updateVolumeLabel();
    vol.addEventListener('input', () => {
      volume = Math.max(0, Math.min(1, Number(vol.value) || 0));
      updateVolumeLabel();
      scheduleSave(180);
    });

    document.getElementById('addPlaylistTrack').addEventListener('click', () => {
      playlist.push({ id: uid(), title: `TRACK ${playlist.length + 1}`, artist: '', audio_path: '', cover_path: '' });
      renderTracks();
      scheduleSave(120);
    });

    // Hide the obsolete separate BGM upload card, but keep it in DOM for legacy admin.js bindings.
    const audioPanel = document.querySelector('[data-tab-panel="audio"] .panel-grid');
    const oldBgmCard = audioPanel?.children?.[0];
    if (oldBgmCard) oldBgmCard.style.display = 'none';
    if (audioPanel && !document.getElementById('bgmMergedNotice')) {
      const notice = document.createElement('article');
      notice.id = 'bgmMergedNotice';
      notice.className = 'admin-card hint-card';
      notice.innerHTML = '<h3>사이트 BGM</h3><p>사이트 BGM은 이제 MUSIC WIDGET 재생목록과 통합되었습니다. 곡 추가와 기본 BGM 설정은 MUSIC WIDGET 메뉴에서 관리하세요.</p>';
      audioPanel.prepend(notice);
    }
  }

  function updateVolumeLabel() {
    const label = document.getElementById('playlistVolumeLabel');
    if (label) label.textContent = `${Math.round(volume * 100)}%`;
  }

  function renderTracks() {
    const root = document.getElementById('playlistTrackList');
    if (!root) return;
    root.innerHTML = '';
    if (!playlist.length) {
      root.innerHTML = '<div class="pl-empty">아직 등록된 곡이 없습니다. ‘+ 곡 추가’를 눌러 첫 BGM을 등록하세요.</div>';
      return;
    }

    playlist.forEach((track, index) => {
      const row = document.createElement('div');
      row.className = 'pl-track';

      const cover = document.createElement('div');
      cover.className = 'pl-cover';
      cover.textContent = String(index + 1).padStart(2, '0');
      const coverUrl = publicUrl(track.cover_path);
      if (coverUrl) { cover.style.backgroundImage = `url("${String(coverUrl).replace(/["\\\n\r]/g, '')}")`; cover.textContent = ''; }

      const fields = document.createElement('div');
      fields.className = 'pl-fields';
      fields.innerHTML = `
        <label>곡 제목<input class="pl-title" type="text"></label>
        <label>아티스트<input class="pl-artist" type="text"></label>
        <label class="wide">음원 파일<input class="pl-audio" type="file" accept="audio/*"></label>
        <label class="wide">커버 이미지<input class="pl-cover-file" type="file" accept="image/*"></label>
        <div class="pl-status">${track.audio_path ? `음원: ${track.audio_path}` : '음원 미등록'}</div>`;
      fields.querySelector('.pl-title').value = track.title || '';
      fields.querySelector('.pl-artist').value = track.artist || '';
      fields.querySelector('.pl-title').addEventListener('input', e => { track.title = e.target.value; scheduleSave(); });
      fields.querySelector('.pl-artist').addEventListener('input', e => { track.artist = e.target.value; scheduleSave(); });

      fields.querySelector('.pl-audio').addEventListener('change', async e => {
        const file = e.target.files?.[0]; if (!file) return;
        try {
          const status = document.getElementById('saveStatus'); if (status) status.textContent = '음원 업로드 중…';
          const old = track.audio_path;
          track.audio_path = await uploadFile(file, `playlist/${track.id}/audio`);
          await persistPlaylist(false);
          await removeStoredFile(old);
          renderTracks();
          toast('음원이 업로드되었습니다.', 'success');
        } catch (error) { handleError(error); }
      });

      fields.querySelector('.pl-cover-file').addEventListener('change', async e => {
        const file = e.target.files?.[0]; if (!file) return;
        try {
          const status = document.getElementById('saveStatus'); if (status) status.textContent = '커버 업로드 중…';
          const old = track.cover_path;
          track.cover_path = await uploadFile(file, `playlist/${track.id}/cover`);
          await persistPlaylist(false);
          await removeStoredFile(old);
          renderTracks();
          toast('커버 이미지가 업로드되었습니다.', 'success');
        } catch (error) { handleError(error); }
      });

      const actions = document.createElement('div');
      actions.className = 'pl-actions';
      const up = document.createElement('button'); up.type = 'button'; up.className = 'secondary-button'; up.textContent = '↑'; up.disabled = index === 0;
      const down = document.createElement('button'); down.type = 'button'; down.className = 'secondary-button'; down.textContent = '↓'; down.disabled = index === playlist.length - 1;
      const del = document.createElement('button'); del.type = 'button'; del.className = 'ghost-button'; del.textContent = '삭제';
      up.addEventListener('click', () => moveTrack(index, -1));
      down.addEventListener('click', () => moveTrack(index, 1));
      del.addEventListener('click', () => deleteTrack(index));
      actions.append(up, down, del);

      row.append(cover, fields, actions);
      root.appendChild(row);
    });
  }

  function moveTrack(index, delta) {
    const next = index + delta;
    if (next < 0 || next >= playlist.length) return;
    [playlist[index], playlist[next]] = [playlist[next], playlist[index]];
    renderTracks();
    scheduleSave(100);
  }

  async function deleteTrack(index) {
    const track = playlist[index];
    if (!track || !confirm(`“${track.title || '이 곡'}”을 재생목록에서 삭제할까요?`)) return;
    playlist.splice(index, 1);
    renderTracks();
    try {
      await persistPlaylist(false);
      await removeStoredFile(track.audio_path);
      await removeStoredFile(track.cover_path);
      toast('곡이 삭제되었습니다.', 'success');
    } catch (error) { handleError(error); }
  }

  async function initManager() {
    if (initialized || !window.db || !window.SUPABASE_CONFIGURED) return;
    const app = document.getElementById('adminApp');
    if (!app || app.classList.contains('hidden')) return;
    initialized = true;
    injectStyles();

    try {
      const settings = await fetchSettings();
      playlist = (Array.isArray(settings.music_playlist) ? settings.music_playlist : migrateLegacy(settings)).map(normalizeTrack);
      volume = Number(settings.music_playlist_volume ?? settings.widget_volume ?? settings.bgm_volume ?? 0.7);
      if (!Number.isFinite(volume)) volume = 0.7;
      volume = Math.max(0, Math.min(1, volume));

      const panel = document.querySelector('[data-tab-panel="music"]');
      buildManager(panel);
      renderTracks();

      if (!Array.isArray(settings.music_playlist) && playlist.length) {
        await persistPlaylist(false);
      }

      const saveAll = document.getElementById('saveAllButton');
      saveAll?.addEventListener('click', () => setTimeout(() => persistPlaylist(false).catch(handleError), 900));
    } catch (error) {
      handleError(error);
    }
  }

  const timer = setInterval(() => {
    if (initialized) { clearInterval(timer); return; }
    initManager();
  }, 250);
  setTimeout(() => clearInterval(timer), 30000);
})();
