(function () {
  'use strict';

  const cfg = window.APP_CONFIG || {};
  const $ = (s, root = document) => root.querySelector(s);
  let playlist = [];
  let currentIndex = 0;
  let entered = false;
  let audio = null;
  let playButton = null;
  let prevButton = null;
  let nextButton = null;
  let listButton = null;
  let progress = null;
  let volume = null;
  let timeLabel = null;
  let listPanel = null;

  function publicUrl(path) {
    if (!path) return '';
    return window.publicUrlForPath ? window.publicUrlForPath(path) : path;
  }

  function legacyToPlaylist(settings) {
    const tracks = [];
    const seen = new Set();
    const add = (path, title, artist, cover) => {
      const p = String(path || '').trim();
      if (!p || seen.has(p)) return;
      seen.add(p);
      tracks.push({
        id: `legacy-${tracks.length + 1}`,
        title: title || `TRACK ${tracks.length + 1}`,
        artist: artist || '',
        audio_path: p,
        cover_path: cover || ''
      });
    };
    add(settings.bgm_url, settings.bgm_title || 'SITE THEME', '', '');
    add(settings.widget_track_url, settings.widget_track_title || 'THEME TRACK', settings.widget_track_artist || '', settings.widget_cover_url || '');
    return tracks;
  }

  function normalizePlaylist(settings) {
    const source = Array.isArray(settings.music_playlist) ? settings.music_playlist : legacyToPlaylist(settings);
    return source.map((item, index) => ({
      id: item?.id || `track-${index + 1}`,
      title: String(item?.title || `TRACK ${index + 1}`),
      artist: String(item?.artist || ''),
      audio_path: String(item?.audio_path || item?.audio || ''),
      cover_path: String(item?.cover_path || item?.cover || '')
    })).filter(item => item.audio_path);
  }

  async function fetchSettings() {
    if (!window.db || !window.SUPABASE_CONFIGURED) return {};
    try {
      const { data, error } = await window.db
        .from('site_content')
        .select('settings_json')
        .eq('id', cfg.siteId || 1)
        .single();
      if (error) throw error;
      return data?.settings_json || {};
    } catch (error) {
      console.warn('재생목록을 불러오지 못했습니다.', error);
      return {};
    }
  }

  function stopLegacyAudio() {
    const legacyBgm = document.getElementById('bgmAudio');
    if (!legacyBgm) return;
    try { legacyBgm.pause(); } catch (_) {}
    legacyBgm.removeAttribute('src');
    try { legacyBgm.load(); } catch (_) {}
  }

  function replaceAudioElement() {
    const old = document.getElementById('widgetAudio');
    if (!old) return null;
    try { old.pause(); } catch (_) {}
    const fresh = document.createElement('audio');
    fresh.id = 'widgetAudio';
    fresh.preload = 'metadata';
    old.replaceWith(fresh);
    return fresh;
  }

  function cloneControl(id) {
    const old = document.getElementById(id);
    if (!old) return null;
    const fresh = old.cloneNode(true);
    old.replaceWith(fresh);
    return fresh;
  }

  function injectStyles() {
    if (document.getElementById('playlistWidgetStyles')) return;
    const style = document.createElement('style');
    style.id = 'playlistWidgetStyles';
    style.textContent = `
      #musicWidget{overflow:visible!important;width:300px!important}
      #musicWidget .playlist-controls{display:grid;grid-template-columns:30px 30px 30px 44px;gap:5px;align-items:center;margin-top:12px}
      #musicWidget .playlist-control{height:30px;border:1px solid rgba(226,220,191,.25);background:rgba(226,220,191,.045);color:var(--accent-soft,#ebe4c2);font:600 11px Georgia,serif;cursor:pointer}
      #musicWidget .playlist-control:hover{border-color:rgba(226,220,191,.52);background:rgba(226,220,191,.10)}
      #musicWidget .playlist-list-button{font-size:9px;letter-spacing:.08em}
      #musicWidget .playlist-progress-row{display:flex;align-items:center;gap:8px;margin-top:8px}
      #musicWidget .playlist-progress-row input{min-width:0;flex:1}
      #musicWidget .playlist-panel{position:absolute;left:calc(100% + 10px);top:40px;width:248px;max-height:330px;overflow:auto;padding:8px;border:1px solid rgba(226,220,192,.46);background:rgba(57,59,54,.98);box-shadow:0 18px 44px rgba(18,19,17,.36);z-index:9999;display:none}
      #musicWidget .playlist-panel.open{display:block!important}
      #musicWidget .playlist-panel::before{content:'PLAYLIST';display:block;padding:4px 7px 9px;color:var(--accent,#d9d0a4);font:600 9px Georgia,serif;letter-spacing:.18em;border-bottom:1px solid rgba(226,220,191,.14)}
      #musicWidget .playlist-item{width:100%;display:grid;grid-template-columns:38px minmax(0,1fr);gap:9px;align-items:center;padding:7px;border:0;border-bottom:1px solid rgba(226,220,191,.09);background:transparent;color:#d8d3bd;text-align:left;cursor:pointer}
      #musicWidget .playlist-item:hover{background:rgba(226,220,191,.06)}
      #musicWidget .playlist-item.active{background:rgba(217,208,164,.10);box-shadow:inset 2px 0 0 var(--accent,#d9d0a4)}
      #musicWidget .playlist-thumb{width:38px;height:38px;border:1px solid rgba(226,220,191,.18);background:rgba(255,255,255,.04);background-size:cover;background-position:center}
      #musicWidget .playlist-item strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:600 11px Georgia,serif;color:#eee8d0}
      #musicWidget .playlist-item span{display:block;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:9px;color:#aaa79a}
      #musicWidget .playlist-empty{padding:16px 8px;color:#aaa79a;font-size:10px;line-height:1.6}
      #musicWidget .legacy-bgm-row{display:none!important}
      @media(max-width:760px){#musicWidget .playlist-panel{left:0;top:calc(100% + 8px);width:100%}}
    `;
    document.head.appendChild(style);
  }

  function renderPlaylistPanel() {
    if (!listPanel) return;
    listPanel.innerHTML = '';
    if (!playlist.length) {
      const empty = document.createElement('div');
      empty.className = 'playlist-empty';
      empty.textContent = '관리자 페이지의 MUSIC WIDGET에서 곡을 추가할 수 있습니다.';
      listPanel.appendChild(empty);
      return;
    }
    playlist.forEach((track, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `playlist-item${index === currentIndex ? ' active' : ''}`;
      const thumb = document.createElement('span');
      thumb.className = 'playlist-thumb';
      const cover = publicUrl(track.cover_path);
      if (cover) thumb.style.backgroundImage = `url("${String(cover).replace(/["\\\n\r]/g, '')}")`;
      const meta = document.createElement('span');
      const title = document.createElement('strong');
      title.textContent = track.title || `TRACK ${index + 1}`;
      const artist = document.createElement('span');
      artist.textContent = track.artist || '—';
      meta.append(title, artist);
      button.append(thumb, meta);
      button.addEventListener('click', () => {
        loadTrack(index, true);
        listPanel.classList.remove('open');
      });
      listPanel.appendChild(button);
    });
  }

  function updateMeta() {
    const track = playlist[currentIndex];
    const title = document.getElementById('widgetTrackTitle');
    const artist = document.getElementById('widgetTrackArtist');
    const cover = document.getElementById('musicCover');
    if (title) title.textContent = track?.title || 'NO TRACK';
    if (artist) artist.textContent = track?.artist || '—';
    if (cover) {
      const coverUrl = publicUrl(track?.cover_path || '');
      cover.style.backgroundImage = coverUrl ? `url("${String(coverUrl).replace(/["\\\n\r]/g, '')}")` : '';
    }
    renderPlaylistPanel();
  }

  function loadTrack(index, autoplay) {
    if (!playlist.length || !audio) return;
    currentIndex = ((Number(index) || 0) % playlist.length + playlist.length) % playlist.length;
    const track = playlist[currentIndex];
    const url = publicUrl(track.audio_path);
    if (!url) return;
    const wasPlaying = !audio.paused;
    audio.src = url;
    audio.currentTime = 0;
    audio.load();
    updateMeta();
    if (progress) progress.value = 0;
    if (timeLabel) timeLabel.textContent = '00:00 / 00:00';
    if (autoplay && (entered || wasPlaying)) audio.play().catch(() => {});
  }

  function changeTrack(delta) {
    if (playlist.length) loadTrack(currentIndex + delta, true);
  }

  function formatTime(value) {
    if (!Number.isFinite(value)) return '00:00';
    const m = Math.floor(value / 60);
    const s = Math.floor(value % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function setupControls(settings) {
    audio = replaceAudioElement();
    if (!audio) return;
    stopLegacyAudio();

    playButton = cloneControl('widgetPlayButton');
    prevButton = cloneControl('playlistPrevButton');
    nextButton = cloneControl('playlistNextButton');
    listButton = cloneControl('playlistListButton');
    progress = cloneControl('widgetProgress');
    volume = cloneControl('widgetVolume');
    timeLabel = document.getElementById('widgetTime');
    listPanel = document.getElementById('playlistPanel');

    const oldBgmToggle = document.getElementById('bgmToggle');
    if (oldBgmToggle?.parentElement) oldBgmToggle.parentElement.classList.add('legacy-bgm-row');

    const initialVolume = Number(settings.music_playlist_volume ?? settings.widget_volume ?? settings.bgm_volume ?? 0.7);
    audio.volume = Number.isFinite(initialVolume) ? Math.max(0, Math.min(1, initialVolume)) : 0.7;
    if (volume) volume.value = audio.volume;

    prevButton?.addEventListener('click', () => changeTrack(-1));
    nextButton?.addEventListener('click', () => changeTrack(1));
    listButton?.addEventListener('click', event => {
      event.stopPropagation();
      listPanel?.classList.toggle('open');
    });
    document.addEventListener('pointerdown', event => {
      if (!listPanel?.classList.contains('open')) return;
      if (listPanel.contains(event.target) || listButton?.contains(event.target)) return;
      listPanel.classList.remove('open');
    });

    playButton?.addEventListener('click', () => {
      if (!playlist.length) return;
      if (audio.paused) {
        entered = true;
        audio.play().catch(() => {});
      } else audio.pause();
    });

    progress?.addEventListener('input', () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        audio.currentTime = (Number(progress.value) / 1000) * audio.duration;
      }
    });
    volume?.addEventListener('input', () => {
      audio.volume = Math.max(0, Math.min(1, Number(volume.value) || 0));
    });

    audio.addEventListener('play', () => { if (playButton) playButton.textContent = '❚❚'; });
    audio.addEventListener('pause', () => { if (playButton) playButton.textContent = '▶'; });
    audio.addEventListener('timeupdate', () => {
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
      const current = audio.currentTime || 0;
      if (progress) progress.value = duration ? Math.round((current / duration) * 1000) : 0;
      if (timeLabel) timeLabel.textContent = `${formatTime(current)} / ${formatTime(duration)}`;
    });
    audio.addEventListener('ended', () => changeTrack(1));

    document.getElementById('enterButton')?.addEventListener('click', () => {
      entered = true;
      setTimeout(() => {
        stopLegacyAudio();
        if (playlist.length && audio.paused) audio.play().catch(() => {});
      }, 0);
    });
  }

  async function boot() {
    injectStyles();
    const titlebar = document.querySelector('#musicWidget .widget-titlebar span');
    if (titlebar) titlebar.textContent = 'Nostalgia.exe';
    const settings = await fetchSettings();
    playlist = normalizePlaylist(settings);
    setupControls(settings);
    if (playlist.length) loadTrack(0, false);
    else updateMeta();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 160), { once: true });
  } else setTimeout(boot, 160);
})();
