(function () {
  'use strict';

  // Desktop cursor only. The site keeps the native cursor on touch devices.
  if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches && !window.matchMedia('(pointer: fine)').matches) return;

  const cfg = window.APP_CONFIG || {};
  const state = {
    cursorUrl: 'assets/default-cursor.svg',
    cursorSize: 56,
    trailStyle: 'sparkle',
    trailSpacing: 10,
    trailSize: 14,
    trailFade: 520,
    trailImageUrl: ''
  };

  let lastTrailX = -9999;
  let lastTrailY = -9999;
  let lastMouseX = 0;
  let lastMouseY = 0;
  let hasMouse = false;

  function clamp(value, min, max, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
  }

  function publicUrl(path) {
    if (!path) return '';
    return window.publicUrlForPath ? window.publicUrlForPath(path) : path;
  }

  function safeUrl(value) {
    return String(value || '').replace(/["\\\n\r]/g, '');
  }

  function installCss() {
    let style = document.getElementById('nostalgiaStableCursorCss');
    if (style) return;
    style = document.createElement('style');
    style.id = 'nostalgiaStableCursorCss';
    style.textContent = `
      #customCursor,
      #trailLayer,
      #particleLayer,
      #nostalgiaCursorFxLayer,
      #nostalgiaCursorRuntimeLayer {
        display: none !important;
      }

      #nostalgiaStableFxLayer {
        position: fixed !important;
        inset: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        pointer-events: none !important;
        overflow: hidden !important;
        z-index: 2147483600 !important;
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
      }

      #nostalgiaStableCursor {
        position: fixed !important;
        left: 0;
        top: 0;
        pointer-events: none !important;
        z-index: 2147483646 !important;
        background-repeat: no-repeat !important;
        background-position: center !important;
        background-size: contain !important;
        transform: translate(-20.3%, -10.9%) !important;
        transform-origin: 20.3% 10.9% !important;
        opacity: 0;
        display: block !important;
        visibility: visible !important;
        transition: opacity .06s linear !important;
      }

      #nostalgiaStableCursor.is-visible { opacity: 1 !important; }

      body.custom-cursor-enabled,
      body.custom-cursor-enabled * {
        cursor: none !important;
      }

      @media (max-width: 680px) and (pointer: coarse) {
        #nostalgiaStableFxLayer,
        #nostalgiaStableCursor { display: none !important; }
        body.custom-cursor-enabled,
        body.custom-cursor-enabled * { cursor: auto !important; }
      }
    `;
    document.head.appendChild(style);
  }

  function ensureElements() {
    installCss();

    let layer = document.getElementById('nostalgiaStableFxLayer');
    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'nostalgiaStableFxLayer';
      layer.setAttribute('aria-hidden', 'true');
      document.body.appendChild(layer);
    }

    let pointer = document.getElementById('nostalgiaStableCursor');
    if (!pointer) {
      pointer = document.createElement('div');
      pointer.id = 'nostalgiaStableCursor';
      pointer.setAttribute('aria-hidden', 'true');
      document.body.appendChild(pointer);
    }

    document.body.classList.add('custom-cursor-enabled');
    return { layer, pointer };
  }

  function applyPointerVisual() {
    const { pointer } = ensureElements();
    const configured = Number(state.cursorSize);
    // Keep the cursor comfortably visible even if the old 34px default was restored.
    const size = !Number.isFinite(configured) ? 56 : Math.max(56, Math.min(160, configured));
    const url = publicUrl(state.cursorUrl) || 'assets/default-cursor.svg';

    pointer.style.width = `${size}px`;
    pointer.style.height = `${size}px`;
    pointer.style.backgroundImage = `url("${safeUrl(url)}")`;

    if (hasMouse) {
      pointer.style.left = `${lastMouseX}px`;
      pointer.style.top = `${lastMouseY}px`;
      pointer.classList.add('is-visible');
    }
  }

  function makeTrail(x, y) {
    const dx = x - lastTrailX;
    const dy = y - lastTrailY;
    const spacing = clamp(state.trailSpacing, 4, 60, 10);
    if (Math.hypot(dx, dy) < spacing) return;
    lastTrailX = x;
    lastTrailY = y;

    const { layer } = ensureElements();
    const node = document.createElement('span');
    let style = ['sparkle', 'star', 'dot', 'glow', 'image'].includes(state.trailStyle) ? state.trailStyle : 'sparkle';
    const size = clamp(state.trailSize, 5, 60, 14);
    const duration = clamp(state.trailFade, 180, 2500, 520);

    node.style.position = 'fixed';
    node.style.left = `${x}px`;
    node.style.top = `${y}px`;
    node.style.width = `${size}px`;
    node.style.height = `${size}px`;
    node.style.pointerEvents = 'none';
    node.style.transform = 'translate(-50%, -50%) scale(1)';
    node.style.opacity = '.9';
    node.style.color = 'var(--accent, #d9d0a4)';
    node.style.fontFamily = 'Georgia, "Times New Roman", serif';
    node.style.fontSize = `${size}px`;
    node.style.lineHeight = '1';
    node.style.display = 'grid';
    node.style.placeItems = 'center';
    node.style.textShadow = '0 0 10px currentColor';

    if (style === 'dot') {
      node.style.borderRadius = '50%';
      node.style.background = 'var(--accent, #d9d0a4)';
      node.style.boxShadow = '0 0 8px var(--accent, #d9d0a4)';
    } else if (style === 'glow') {
      node.style.borderRadius = '50%';
      node.style.background = 'var(--accent, #d9d0a4)';
      node.style.filter = 'blur(4px)';
      node.style.boxShadow = '0 0 16px var(--accent, #d9d0a4)';
    } else if (style === 'image') {
      const url = publicUrl(state.trailImageUrl);
      if (url) {
        node.style.backgroundImage = `url("${safeUrl(url)}")`;
        node.style.backgroundRepeat = 'no-repeat';
        node.style.backgroundPosition = 'center';
        node.style.backgroundSize = 'contain';
      } else {
        style = 'sparkle';
        node.textContent = '✦';
      }
    } else {
      node.textContent = style === 'star' ? '✧' : '✦';
    }

    layer.appendChild(node);

    const start = performance.now();
    function frame(now) {
      if (!node.isConnected) return;
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 2);
      node.style.opacity = String(.9 * (1 - eased));
      const scale = 1 - (.72 * eased);
      const rotate = 18 * eased;
      node.style.transform = `translate(-50%, -50%) scale(${scale}) rotate(${rotate}deg)`;
      if (t < 1) requestAnimationFrame(frame);
      else node.remove();
    }
    requestAnimationFrame(frame);
    setTimeout(() => node.remove(), duration + 200);
  }

  function makeClickParticles(x, y) {
    const { layer } = ensureElements();
    for (let i = 0; i < 7; i++) {
      const node = document.createElement('span');
      node.textContent = '✧';
      const angle = (Math.PI * 2 * i / 7) + Math.random() * .2;
      const distance = 22 + Math.random() * 32;
      const targetX = Math.cos(angle) * distance;
      const targetY = Math.sin(angle) * distance;
      const spin = Math.random() * 150 - 75;

      node.style.position = 'fixed';
      node.style.left = `${x}px`;
      node.style.top = `${y}px`;
      node.style.pointerEvents = 'none';
      node.style.color = 'var(--accent, #d9d0a4)';
      node.style.fontSize = `${8 + Math.random() * 7}px`;
      node.style.lineHeight = '1';
      node.style.textShadow = '0 0 8px currentColor';
      node.style.opacity = '.95';
      node.style.transform = 'translate(-50%, -50%) scale(.6)';
      layer.appendChild(node);

      const start = performance.now();
      const duration = 520;
      function frame(now) {
        if (!node.isConnected) return;
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        node.style.opacity = String(.95 * (1 - t));
        node.style.transform = `translate(-50%, -50%) translate(${targetX * eased}px, ${targetY * eased}px) scale(${.6 + .45 * eased}) rotate(${spin * eased}deg)`;
        if (t < 1) requestAnimationFrame(frame);
        else node.remove();
      }
      requestAnimationFrame(frame);
      setTimeout(() => node.remove(), 750);
    }
  }

  function onMouseMove(event) {
    hasMouse = true;
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;

    const { pointer } = ensureElements();
    pointer.style.left = `${lastMouseX}px`;
    pointer.style.top = `${lastMouseY}px`;
    pointer.classList.add('is-visible');

    makeTrail(lastMouseX, lastMouseY);
  }

  function resetAfterEnter() {
    ensureElements();
    applyPointerVisual();
    lastTrailX = -9999;
    lastTrailY = -9999;
  }

  async function loadSettings() {
    try {
      if (!window.SUPABASE_CONFIGURED || !window.db) return;
      const { data, error } = await window.db
        .from('site_content')
        .select('settings_json')
        .eq('id', cfg.siteId || 1)
        .single();
      if (error) throw error;
      const s = data?.settings_json || {};
      state.cursorUrl = s.cursor_url || state.cursorUrl;
      state.cursorSize = s.cursor_size ?? state.cursorSize;
      state.trailStyle = s.trail_style || state.trailStyle;
      state.trailSpacing = s.trail_spacing ?? state.trailSpacing;
      state.trailSize = s.trail_size ?? state.trailSize;
      state.trailFade = s.trail_fade_ms ?? state.trailFade;
      state.trailImageUrl = s.trail_image_url || '';
    } catch (error) {
      console.warn('커서 설정을 불러오지 못해 기본 효과를 사용합니다.', error);
    } finally {
      applyPointerVisual();
    }
  }

  ensureElements();
  applyPointerVisual();

  // mousemove is intentionally used here instead of the previous pointermove chain.
  // It remains active through the ENTER overlay transition on desktop browsers.
  document.addEventListener('mousemove', onMouseMove, true);
  window.addEventListener('mousemove', onMouseMove, true);

  document.addEventListener('mousedown', event => {
    makeClickParticles(event.clientX, event.clientY);
    applyPointerVisual();
  }, true);

  document.addEventListener('mouseleave', () => {
    document.getElementById('nostalgiaStableCursor')?.classList.remove('is-visible');
  });

  const enter = document.getElementById('enterButton');
  enter?.addEventListener('click', () => {
    resetAfterEnter();
    requestAnimationFrame(resetAfterEnter);
    setTimeout(resetAfterEnter, 80);
    setTimeout(resetAfterEnter, 500);
  }, true);

  window.addEventListener('pageshow', resetAfterEnter);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) resetAfterEnter();
  });

  loadSettings();
})();