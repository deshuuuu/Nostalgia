(function () {
  'use strict';

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const cfg = window.APP_CONFIG || {};
  let content = structuredClone(window.DEFAULT_SITE_CONTENT);
  let gallery = [];
  let settings = content.settings_json;
  let trailLast = { x: -999, y: -999 };
  let entered = false;

  const els = {
    entry: $('#entryOverlay'), enter: $('#enterButton'),
    bgm: $('#bgmAudio'), click: $('#clickAudio'), widgetAudio: $('#widgetAudio'), keycapAudio: $('#keycapAudio'),
    cursor: $('#customCursor'), trailLayer: $('#trailLayer'), particleLayer: $('#particleLayer'),
    musicWidget: $('#musicWidget'), keycapWidget: $('#keycapWidget'), keycapMount: $('#keycapMount')
  };

  async function init() {
    await loadData();
    renderAll();
    bindNavigation();
    bindEntry();
    bindAudioControls();
    bindWidgetDragging();
    bindGlobalClickSound();
    bindGalleryDialog();
    setupCursor();
    setupKeycap();
    const hashPage = location.hash.replace('#', '');
    if (['home', 'profile', 'story', 'gallery'].includes(hashPage)) showPage(hashPage, false);
  }

  async function loadData() {
    if (!window.SUPABASE_CONFIGURED) return;
    try {
      const [{ data: row, error: contentError }, { data: galleryRows, error: galleryError }] = await Promise.all([
        window.db.from('site_content').select('*').eq('id', cfg.siteId || 1).single(),
        window.db.from('gallery_items').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: true })
      ]);
      if (contentError) throw contentError;
      if (row) content = mergeContent(row);
      if (galleryError) throw galleryError;
      gallery = galleryRows || [];
    } catch (error) {
      console.warn('Supabase 데이터를 불러오지 못해 기본 데이터를 사용합니다.', error);
    }
    settings = { ...window.DEFAULT_SITE_CONTENT.settings_json, ...(content.settings_json || {}) };
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

  function renderAll() {
    settings = { ...window.DEFAULT_SITE_CONTENT.settings_json, ...(content.settings_json || {}) };
    document.title = settings.site_title || content.character_name || 'Character Home';
    document.documentElement.style.setProperty('--accent', settings.accent_color || '#d9d0a4');
    document.documentElement.style.setProperty('--bg', settings.background_color || '#55564f');
    document.body.style.backgroundColor = settings.background_color || '#55564f';

    const name = content.character_name || 'CHARACTER';
    const tagline = content.tagline || '';
    $('#entryTitle').textContent = name;
    $('#entryTagline').textContent = tagline;
    $('#entryKicker').textContent = settings.entry_kicker || 'A MEMORY, KEPT QUIETLY.';
    $('#entryNote').textContent = settings.entry_note || '브라우저 정책상 ENTER 이후 음악이 재생됩니다. (AI 제작 음악)';
    $('#enterButton').textContent = settings.enter_label || 'ENTER';
    const entryImageUrl = window.publicUrlForPath(settings.entry_image_url) || window.publicUrlForPath(content.character_image_url) || 'assets/placeholder-character.svg';
    $('#entryImage').src = entryImageUrl;
    $('#siteBrand').textContent = name;
    $('#heroName').textContent = name;
    $('#heroTagline').textContent = tagline;
    $('#profileName').textContent = name;
    $('#footerName').textContent = `${name} ARCHIVE`;

    const imageUrl = window.publicUrlForPath(content.character_image_url) || 'assets/placeholder-character.svg';
    $('#characterImage').src = imageUrl;
    $('#profileImage').src = imageUrl;

    const profile = content.profile_json || {};
    $('#profileBio').textContent = profile.bio || '';
    const fields = $('#profileFields');
    fields.innerHTML = '';
    (profile.fields || []).forEach(item => {
      const row = document.createElement('div');
      row.className = 'profile-field';
      const dt = document.createElement('dt');
      const dd = document.createElement('dd');
      dt.textContent = item.label || '';
      dd.textContent = item.value || '';
      row.append(dt, dd);
      fields.append(row);
    });

    renderStory();
    renderGallery();
    applyAudioSettings();
    applyMusicWidgetMeta();
  }

  function renderStory() {
    const target = $('#storyList');
    target.innerHTML = '';
    const chapters = Array.isArray(content.story_json) ? content.story_json : [];
    if (!chapters.length) {
      target.innerHTML = '<div class="gallery-empty">아직 등록된 스토리가 없습니다.</div>';
      return;
    }
    chapters.forEach((chapter, index) => {
      const details = document.createElement('details');
      details.className = 'story-card';
      const summary = document.createElement('summary');
      summary.textContent = chapter.title || `CHAPTER ${index + 1}`;
      const body = document.createElement('div');
      body.className = 'story-body';
      body.textContent = chapter.body || '';
      details.append(summary, body);
      target.append(details);
    });
  }

  function renderGallery() {
    const target = $('#galleryGrid');
    target.innerHTML = '';
    if (!gallery.length) {
      target.innerHTML = '<div class="gallery-empty">관리자 페이지에서 갤러리 이미지를 업로드할 수 있습니다.</div>';
      return;
    }
    gallery.forEach(item => {
      const button = document.createElement('button');
      button.className = 'gallery-item';
      button.type = 'button';
      const figure = document.createElement('figure');
      figure.style.margin = '0';
      const img = document.createElement('img');
      img.loading = 'lazy';
      img.src = window.publicUrlForPath(item.file_path);
      img.alt = item.alt_text || item.caption || 'Gallery image';
      figure.append(img);
      if (item.caption) {
        const cap = document.createElement('figcaption');
        cap.textContent = item.caption;
        figure.append(cap);
      }
      button.append(figure);
      button.addEventListener('click', () => openGallery(item));
      target.append(button);
    });
  }

  function bindNavigation() {
    $$('.nav-button[data-page]').forEach(btn => {
      btn.addEventListener('click', () => showPage(btn.dataset.page));
    });
  }

  function showPage(page, updateHash = true) {
    $$('[data-page-panel]').forEach(p => p.classList.toggle('active', p.dataset.pagePanel === page));
    $$('.top-nav .nav-button').forEach(b => b.classList.toggle('active', b.dataset.page === page));
    if (updateHash) history.replaceState(null, '', `#${page}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function bindEntry() {
    els.enter.addEventListener('click', async () => {
      entered = true;
      els.entry.classList.add('hidden');
      if (settings.bgm_url) {
        try { await els.bgm.play(); } catch (e) { console.warn('BGM 재생이 차단되었습니다.', e); }
      }
      playClickSound();
    });
  }

  function applyAudioSettings() {
    setAudioSource(els.bgm, settings.bgm_url);
    els.bgm.volume = clampNumber(settings.bgm_volume, 0, 1, .45);
    setAudioSource(els.click, settings.click_sound_url);
    els.click.volume = clampNumber(settings.click_volume, 0, 1, .55);
    setAudioSource(els.widgetAudio, settings.widget_track_url);
    els.widgetAudio.volume = clampNumber(settings.widget_volume, 0, 1, .7);
    $('#widgetVolume').value = els.widgetAudio.volume;
    updateBgmStatus();
  }

  function applyMusicWidgetMeta() {
    $('#widgetTrackTitle').textContent = settings.widget_track_title || settings.bgm_title || 'THEME TRACK';
    $('#widgetTrackArtist').textContent = settings.widget_track_artist || 'UNKNOWN';
    const cover = window.publicUrlForPath(settings.widget_cover_url || '');
    $('#musicCover').style.backgroundImage = cover ? `url("${cssUrl(cover)}")` : '';
  }

  function bindAudioControls() {
    const playBtn = $('#widgetPlayButton');
    const progress = $('#widgetProgress');
    const volume = $('#widgetVolume');
    const time = $('#widgetTime');

    playBtn.addEventListener('click', async () => {
      if (!settings.widget_track_url) return;
      if (els.widgetAudio.paused) {
        if (settings.pause_bgm_on_widget_play && !els.bgm.paused) {
          els.bgm.dataset.pausedForWidget = '1';
          els.bgm.pause();
        }
        try { await els.widgetAudio.play(); } catch (e) { console.warn(e); }
      } else {
        els.widgetAudio.pause();
      }
    });
    els.widgetAudio.addEventListener('play', () => { playBtn.textContent = '❚❚'; });
    els.widgetAudio.addEventListener('pause', () => {
      playBtn.textContent = '▶';
      if (els.bgm.dataset.pausedForWidget === '1' && entered) {
        delete els.bgm.dataset.pausedForWidget;
        els.bgm.play().catch(() => {});
      }
    });
    els.widgetAudio.addEventListener('ended', () => {
      if (els.bgm.dataset.pausedForWidget === '1' && entered) {
        delete els.bgm.dataset.pausedForWidget;
        els.bgm.play().catch(() => {});
      }
    });
    els.widgetAudio.addEventListener('timeupdate', () => {
      const duration = Number.isFinite(els.widgetAudio.duration) ? els.widgetAudio.duration : 0;
      const current = els.widgetAudio.currentTime || 0;
      progress.value = duration ? Math.round((current / duration) * 1000) : 0;
      time.textContent = `${formatTime(current)} / ${formatTime(duration)}`;
    });
    progress.addEventListener('input', () => {
      if (Number.isFinite(els.widgetAudio.duration) && els.widgetAudio.duration > 0) {
        els.widgetAudio.currentTime = (Number(progress.value) / 1000) * els.widgetAudio.duration;
      }
    });
    volume.addEventListener('input', () => { els.widgetAudio.volume = Number(volume.value); });
    $('#bgmToggle').addEventListener('click', () => {
      if (!settings.bgm_url) return;
      if (els.bgm.paused) els.bgm.play().catch(() => {}); else els.bgm.pause();
      setTimeout(updateBgmStatus, 0);
    });
    els.bgm.addEventListener('play', updateBgmStatus);
    els.bgm.addEventListener('pause', updateBgmStatus);
  }

  function updateBgmStatus() {
    const on = !els.bgm.paused && Boolean(settings.bgm_url);
    $('#bgmToggle').textContent = on ? 'BGM ON' : 'BGM OFF';
    $('#bgmStatus').style.opacity = on ? '1' : '.3';
  }

  function bindGlobalClickSound() {
    document.addEventListener('pointerdown', event => {
      if (!entered || els.entry.contains(event.target)) return;
      const path = event.composedPath?.() || [];
      if (path.some(node => node?.dataset?.key) || event.target.closest('.drag-handle')) return;
      playClickSound();
    }, { passive: true });
  }

  function playClickSound() {
    if (!settings.click_sound_url || !els.click.src) return;
    try { els.click.currentTime = 0; els.click.play().catch(() => {}); } catch (_) {}
  }

  function bindWidgetDragging() {
    [els.musicWidget, els.keycapWidget].forEach(widget => {
      const name = widget.dataset.widget;
      restoreWidgetState(widget, name);
      const handle = $('.drag-handle', widget);
      let drag = null;
      handle.addEventListener('pointerdown', e => {
        if (e.target.closest('button')) return;
        const rect = widget.getBoundingClientRect();
        drag = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
        handle.setPointerCapture(e.pointerId);
      });
      handle.addEventListener('pointermove', e => {
        if (!drag) return;
        const x = Math.max(0, Math.min(innerWidth - widget.offsetWidth, e.clientX - drag.dx));
        const y = Math.max(0, Math.min(innerHeight - widget.offsetHeight, e.clientY - drag.dy));
        widget.style.left = `${x}px`;
        widget.style.top = `${y}px`;
        widget.style.right = 'auto';
      });
      handle.addEventListener('pointerup', () => {
        drag = null;
        saveWidgetState(widget, name);
      });
      $('.widget-minimize', widget).addEventListener('click', () => {
        widget.classList.toggle('minimized');
        $('.widget-minimize', widget).textContent = widget.classList.contains('minimized') ? '+' : '−';
        saveWidgetState(widget, name);
      });
    });
    addEventListener('resize', () => [els.musicWidget, els.keycapWidget].forEach((w, i) => clampWidget(w, i ? 'keycap' : 'music')));
  }

  function saveWidgetState(widget, name) {
    const r = widget.getBoundingClientRect();
    localStorage.setItem(`character-home-widget-${name}`, JSON.stringify({ x: r.left, y: r.top, minimized: widget.classList.contains('minimized') }));
  }
  function restoreWidgetState(widget, name) {
    try {
      const state = JSON.parse(localStorage.getItem(`character-home-widget-${name}`));
      if (!state) return;
      widget.style.left = `${state.x}px`;
      widget.style.top = `${state.y}px`;
      widget.style.right = 'auto';
      widget.classList.toggle('minimized', Boolean(state.minimized));
      $('.widget-minimize', widget).textContent = state.minimized ? '+' : '−';
      requestAnimationFrame(() => clampWidget(widget, name));
    } catch (_) {}
  }
  function clampWidget(widget, name) {
    const r = widget.getBoundingClientRect();
    const x = Math.max(0, Math.min(innerWidth - r.width, r.left));
    const y = Math.max(0, Math.min(innerHeight - r.height, r.top));
    widget.style.left = `${x}px`;
    widget.style.top = `${y}px`;
    widget.style.right = 'auto';
    saveWidgetState(widget, name);
  }

  function setupKeycap() {
    const root = els.keycapMount.shadowRoot || els.keycapMount.attachShadow({ mode: 'open' });
    root.innerHTML = sanitizeKeycapHtml(content.keycap_html || window.DEFAULT_KEYCAP_HTML);
    root.addEventListener('click', event => {
      const key = event.target.closest?.('[data-key]')?.getAttribute('data-key')?.toUpperCase();
      if (key) triggerKeycap(key, root);
    });
    document.addEventListener('keydown', event => {
      if (event.repeat || ['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName) || document.activeElement?.isContentEditable) return;
      const key = event.key.toUpperCase();
      if (['Z','X','C','V'].includes(key)) triggerKeycap(key, root);
    });
  }

  function triggerKeycap(key, root) {
    const url = window.publicUrlForPath(settings.keycap_sounds?.[key] || '');
    const button = root.querySelector(`[data-key="${CSS.escape(key)}"]`);
    if (button) {
      button.classList.add('pressed');
      setTimeout(() => button.classList.remove('pressed'), 100);
    }
    if (!url) return;
    els.keycapAudio.src = url;
    els.keycapAudio.currentTime = 0;
    els.keycapAudio.play().catch(() => {});
  }

  function sanitizeKeycapHtml(html) {
    const doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
    doc.querySelectorAll('script,iframe,object,embed,link,meta,base,form').forEach(el => el.remove());
    doc.querySelectorAll('*').forEach(el => {
      [...el.attributes].forEach(attr => {
        const n = attr.name.toLowerCase();
        const v = attr.value.trim();
        if (n.startsWith('on') || /^javascript:/i.test(v)) el.removeAttribute(attr.name);
      });
    });
    doc.querySelectorAll('style').forEach(style => {
      style.textContent = style.textContent.replace(/@import[^;]+;/gi, '').replace(/url\s*\(\s*['"]?javascript:[^)]+\)/gi, 'none');
    });
    return `${[...doc.head.querySelectorAll('style')].map(x => x.outerHTML).join('')}${doc.body.innerHTML}`;
  }

  function setupCursor() {
    if (matchMedia('(pointer: coarse)').matches) return;
    document.body.classList.add('custom-cursor-enabled');
    const size = clampNumber(settings.cursor_size, 12, 160, 34);
    els.cursor.style.width = `${size}px`;
    els.cursor.style.height = `${size}px`;
    els.cursor.style.setProperty('--cursor-pressed-scale', clampNumber(settings.cursor_pressed_scale, .4, 1, .82));
    const cursorUrl = window.publicUrlForPath(settings.cursor_url || '') || 'assets/default-cursor.svg';
    els.cursor.style.backgroundImage = `url("${cssUrl(cursorUrl)}")`;

    document.addEventListener('pointermove', e => {
      els.cursor.style.left = `${e.clientX}px`;
      els.cursor.style.top = `${e.clientY}px`;
      els.cursor.classList.add('visible');
      if (settings.trail_enabled) maybeCreateTrail(e.clientX, e.clientY);
    }, { passive: true });
    document.addEventListener('pointerleave', () => els.cursor.classList.remove('visible'));
    document.addEventListener('pointerdown', e => {
      els.cursor.classList.add('pressed');
      if (settings.click_particles) createClickParticles(e.clientX, e.clientY);
    }, { passive: true });
    document.addEventListener('pointerup', () => els.cursor.classList.remove('pressed'), { passive: true });
  }

  function maybeCreateTrail(x, y) {
    const spacing = clampNumber(settings.trail_spacing, 2, 80, 12);
    if (Math.hypot(x - trailLast.x, y - trailLast.y) < spacing) return;
    trailLast = { x, y };
    const el = document.createElement('span');
    const style = ['sparkle','dot','glow','star','image'].includes(settings.trail_style) ? settings.trail_style : 'sparkle';
    el.className = `cursor-trail ${style}`;
    const size = clampNumber(settings.trail_size, 2, 80, 13);
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.fontSize = `${size}px`;
    el.style.setProperty('--trail-duration', `${clampNumber(settings.trail_fade_ms, 100, 3000, 520)}ms`);
    if (style === 'image') {
      const url = window.publicUrlForPath(settings.trail_image_url || '');
      if (url) el.style.backgroundImage = `url("${cssUrl(url)}")`;
    }
    els.trailLayer.append(el);
    el.addEventListener('animationend', () => el.remove());
  }

  function createClickParticles(x, y) {
    for (let i = 0; i < 7; i++) {
      const p = document.createElement('span');
      p.className = 'click-particle';
      const a = (Math.PI * 2 * i / 7) + Math.random() * .35;
      const d = 18 + Math.random() * 34;
      p.style.left = `${x}px`;
      p.style.top = `${y}px`;
      p.style.setProperty('--px', `${Math.cos(a) * d}px`);
      p.style.setProperty('--py', `${Math.sin(a) * d}px`);
      p.style.setProperty('--pr', `${Math.round(Math.random() * 160 - 80)}deg`);
      p.style.fontSize = `${7 + Math.random() * 8}px`;
      els.particleLayer.append(p);
      p.addEventListener('animationend', () => p.remove());
    }
  }

  function bindGalleryDialog() {
    $('#galleryDialogClose').addEventListener('click', () => $('#galleryDialog').close());
    $('#galleryDialog').addEventListener('click', e => { if (e.target === $('#galleryDialog')) $('#galleryDialog').close(); });
  }
  function openGallery(item) {
    $('#galleryDialogImage').src = window.publicUrlForPath(item.file_path);
    $('#galleryDialogImage').alt = item.alt_text || item.caption || 'Gallery image';
    $('#galleryDialogCaption').textContent = item.caption || '';
    $('#galleryDialog').showModal();
  }

  function setAudioSource(audio, path) {
    const url = window.publicUrlForPath(path || '');
    if (url) audio.src = url;
    else { audio.removeAttribute('src'); try { audio.load(); } catch (_) {} }
  }

  function formatTime(value) {
    if (!Number.isFinite(value)) return '00:00';
    const m = Math.floor(value / 60);
    const s = Math.floor(value % 60);
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }
  function clampNumber(value, min, max, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
  }
  function cssUrl(url) { return String(url).replace(/["\\\n\r]/g, ''); }

  init();
})();