(function () {
  'use strict';

  if (matchMedia('(pointer: coarse)').matches) return;

  const cfg = window.APP_CONFIG || {};
  const cursor = document.getElementById('customCursor');
  if (!cursor) return;

  let settings = {
    cursor_url: 'assets/default-cursor.svg',
    cursor_size: 52,
    trail_style: 'sparkle',
    trail_spacing: 12,
    trail_size: 13,
    trail_fade_ms: 520,
    trail_image_url: ''
  };
  let lastTrail = { x: -9999, y: -9999 };

  function clamp(value, min, max, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
  }

  function publicUrl(path) {
    if (!path) return '';
    return window.publicUrlForPath ? window.publicUrlForPath(path) : path;
  }

  function ensureLayer() {
    let layer = document.getElementById('nostalgiaCursorRuntimeLayer');
    if (layer) return layer;

    layer = document.createElement('div');
    layer.id = 'nostalgiaCursorRuntimeLayer';
    layer.setAttribute('aria-hidden', 'true');
    layer.style.cssText = [
      'position:fixed',
      'inset:0',
      'width:100vw',
      'height:100vh',
      'overflow:hidden',
      'pointer-events:none',
      'z-index:2147483000',
      'display:block',
      'visibility:visible',
      'opacity:1'
    ].join(';');
    document.documentElement.appendChild(layer);
    return layer;
  }

  function installGuardStyle() {
    if (document.getElementById('nostalgiaCursorRuntimeStyle')) return;
    const style = document.createElement('style');
    style.id = 'nostalgiaCursorRuntimeStyle';
    style.textContent = `
      #trailLayer,
      #particleLayer { display:none !important; }
      #nostalgiaCursorFxLayer { display:none !important; }
      #nostalgiaCursorRuntimeLayer {
        display:block !important;
        visibility:visible !important;
        opacity:1 !important;
        pointer-events:none !important;
      }
      #customCursor {
        z-index:2147483001 !important;
        transition:none !important;
      }
    `;
    document.head.appendChild(style);
  }

  function resolveCursorSize() {
    const configured = Number(settings.cursor_size);
    // 34px is the old default that resurfaced after the settings overwrite.
    // Restore a comfortable visual size unless the user has explicitly chosen larger.
    if (!Number.isFinite(configured) || configured <= 34) return 52;
    return clamp(configured, 35, 160, 52);
  }

  function applyCursorVisual() {
    const size = resolveCursorSize();
    const url = publicUrl(settings.cursor_url || '') || 'assets/default-cursor.svg';

    cursor.style.setProperty('width', `${size}px`, 'important');
    cursor.style.setProperty('height', `${size}px`, 'important');
    cursor.style.setProperty('background-image', `url("${String(url).replace(/["\\\n\r]/g, '')}")`, 'important');
    cursor.style.setProperty('background-size', 'contain', 'important');
    cursor.style.setProperty('background-repeat', 'no-repeat', 'important');
    cursor.style.setProperty('background-position', 'center', 'important');
    cursor.style.setProperty('--cursor-pressed-scale', '1', 'important');
    cursor.style.setProperty('transform', 'translate(-20.3%, -10.9%) scale(1)', 'important');
    cursor.classList.remove('pressed');
  }

  function createTrail(x, y) {
    const spacing = clamp(settings.trail_spacing, 2, 80, 12);
    if (Math.hypot(x - lastTrail.x, y - lastTrail.y) < spacing) return;
    lastTrail = { x, y };

    const layer = ensureLayer();
    const node = document.createElement('span');
    const style = ['sparkle', 'dot', 'glow', 'star', 'image'].includes(settings.trail_style)
      ? settings.trail_style
      : 'sparkle';
    const size = clamp(settings.trail_size, 2, 80, 13);
    const duration = clamp(settings.trail_fade_ms, 100, 3000, 520);

    node.style.cssText = [
      'position:fixed',
      `left:${x}px`,
      `top:${y}px`,
      `width:${size}px`,
      `height:${size}px`,
      'display:grid',
      'place-items:center',
      'pointer-events:none',
      'transform:translate(-50%,-50%) scale(1)',
      'transform-origin:center',
      'opacity:.82',
      'color:var(--accent,#d9d0a4)',
      `font-size:${size}px`,
      'line-height:1',
      'font-family:Georgia,"Times New Roman",serif',
      'will-change:transform,opacity'
    ].join(';');

    if (style === 'dot') {
      node.style.borderRadius = '50%';
      node.style.background = 'var(--accent,#d9d0a4)';
    } else if (style === 'glow') {
      node.style.borderRadius = '50%';
      node.style.background = 'var(--accent,#d9d0a4)';
      node.style.filter = 'blur(4px)';
      node.style.boxShadow = '0 0 14px color-mix(in srgb, var(--accent,#d9d0a4) 70%, transparent)';
    } else if (style === 'image') {
      const url = publicUrl(settings.trail_image_url || '');
      if (url) {
        node.style.backgroundImage = `url("${String(url).replace(/["\\\n\r]/g, '')}")`;
        node.style.backgroundSize = 'contain';
        node.style.backgroundRepeat = 'no-repeat';
        node.style.backgroundPosition = 'center';
      } else {
        node.textContent = '✦';
        node.style.textShadow = '0 0 9px color-mix(in srgb, var(--accent,#d9d0a4) 70%, transparent)';
      }
    } else {
      node.textContent = style === 'star' ? '✧' : '✦';
      node.style.textShadow = '0 0 9px color-mix(in srgb, var(--accent,#d9d0a4) 70%, transparent)';
    }

    layer.appendChild(node);
    const animation = node.animate([
      { opacity: .85, transform: 'translate(-50%,-50%) scale(1) rotate(0deg)' },
      { opacity: .42, offset: .46, transform: 'translate(-50%,-50%) scale(.78) rotate(7deg)' },
      { opacity: 0, transform: 'translate(-50%,-50%) scale(.18) rotate(20deg)' }
    ], { duration, easing: 'ease-out', fill: 'forwards' });
    animation.finished.catch(() => {}).finally(() => node.remove());
    setTimeout(() => node.remove(), duration + 150);
  }

  function createParticles(x, y) {
    const layer = ensureLayer();
    for (let i = 0; i < 7; i++) {
      const node = document.createElement('span');
      const angle = (Math.PI * 2 * i / 7) + Math.random() * .25;
      const distance = 22 + Math.random() * 34;
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance;
      const size = 8 + Math.random() * 7;

      node.textContent = '✧';
      node.style.cssText = [
        'position:fixed',
        `left:${x}px`,
        `top:${y}px`,
        'pointer-events:none',
        'transform:translate(-50%,-50%)',
        'transform-origin:center',
        'opacity:.95',
        'color:var(--accent,#d9d0a4)',
        `font-size:${size}px`,
        'line-height:1',
        'text-shadow:0 0 8px color-mix(in srgb, var(--accent,#d9d0a4) 65%, transparent)',
        'will-change:transform,opacity'
      ].join(';');
      layer.appendChild(node);

      const animation = node.animate([
        { opacity: .95, transform: 'translate(-50%,-50%) translate(0,0) scale(.55) rotate(0deg)' },
        { opacity: 0, transform: `translate(-50%,-50%) translate(${dx}px,${dy}px) scale(1.05) rotate(${Math.round(Math.random() * 160 - 80)}deg)` }
      ], { duration: 520, easing: 'ease-out', fill: 'forwards' });
      animation.finished.catch(() => {}).finally(() => node.remove());
      setTimeout(() => node.remove(), 700);
    }
  }

  function onMove(event) {
    applyCursorVisual();
    cursor.style.setProperty('left', `${event.clientX}px`, 'important');
    cursor.style.setProperty('top', `${event.clientY}px`, 'important');
    cursor.classList.add('visible');
    createTrail(event.clientX, event.clientY);
  }

  function resetCursor() {
    applyCursorVisual();
  }

  async function loadSettings() {
    if (!window.SUPABASE_CONFIGURED || !window.db) {
      applyCursorVisual();
      return;
    }
    try {
      const { data, error } = await window.db
        .from('site_content')
        .select('settings_json')
        .eq('id', cfg.siteId || 1)
        .single();
      if (error) throw error;
      settings = { ...settings, ...(data?.settings_json || {}) };
    } catch (error) {
      console.warn('커서 설정을 불러오지 못해 복구 기본값을 사용합니다.', error);
    }
    applyCursorVisual();
  }

  installGuardStyle();
  ensureLayer();
  applyCursorVisual();

  // Capture on window keeps working before and after the ENTER overlay transition.
  window.addEventListener('pointermove', onMove, { passive: true, capture: true });
  document.addEventListener('pointerdown', event => {
    createParticles(event.clientX, event.clientY);
    setTimeout(resetCursor, 0);
  }, { passive: true });
  document.addEventListener('pointerup', resetCursor, { passive: true });
  document.addEventListener('pointercancel', resetCursor, { passive: true });
  window.addEventListener('blur', resetCursor);
  window.addEventListener('pageshow', resetCursor);

  document.getElementById('enterButton')?.addEventListener('click', () => {
    resetCursor();
    lastTrail = { x: -9999, y: -9999 };
    requestAnimationFrame(resetCursor);
    setTimeout(resetCursor, 100);
    setTimeout(resetCursor, 700);
  }, true);

  loadSettings();
})();