(function () {
  'use strict';

  if (matchMedia('(pointer: coarse)').matches) return;

  const cfg = window.APP_CONFIG || {};
  let trailSettings = {
    trail_style: 'sparkle',
    trail_spacing: 12,
    trail_size: 13,
    trail_fade_ms: 520,
    trail_image_url: ''
  };
  let last = { x: -9999, y: -9999 };

  function ensureFxLayer() {
    let layer = document.getElementById('nostalgiaCursorFxLayer');
    if (layer) return layer;

    layer = document.createElement('div');
    layer.id = 'nostalgiaCursorFxLayer';
    layer.setAttribute('aria-hidden', 'true');
    layer.style.cssText = [
      'position:fixed',
      'inset:0',
      'width:100vw',
      'height:100vh',
      'pointer-events:none',
      'overflow:hidden',
      'z-index:2147483000',
      'display:block',
      'visibility:visible',
      'opacity:1'
    ].join(';');
    document.body.appendChild(layer);
    return layer;
  }

  function installStyle() {
    if (document.getElementById('cursorRuntimeStyle')) return;
    const style = document.createElement('style');
    style.id = 'cursorRuntimeStyle';
    style.textContent = `
      #nostalgiaCursorFxLayer { display:block !important; visibility:visible !important; opacity:1 !important; }
      #nostalgiaCursorFxLayer .cursor-trail,
      #nostalgiaCursorFxLayer .click-particle { position:fixed !important; pointer-events:none !important; }
      #customCursor { z-index:2147483001 !important; }
    `;
    document.head.appendChild(style);
  }

  function clamp(value, min, max, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
  }

  function cssUrl(value) {
    return String(value || '').replace(/["\\\n\r]/g, '');
  }

  async function loadSettings() {
    if (!window.SUPABASE_CONFIGURED || !window.db) return;
    try {
      const { data, error } = await window.db
        .from('site_content')
        .select('settings_json')
        .eq('id', cfg.siteId || 1)
        .single();
      if (error) throw error;
      trailSettings = { ...trailSettings, ...(data?.settings_json || {}) };
    } catch (error) {
      console.warn('커서 잔상 설정을 불러오지 못해 기본값을 사용합니다.', error);
    }
  }

  function createTrail(x, y) {
    const layer = ensureFxLayer();
    const spacing = clamp(trailSettings.trail_spacing, 2, 80, 12);
    if (Math.hypot(x - last.x, y - last.y) < spacing) return;
    last = { x, y };

    const el = document.createElement('span');
    let style = ['sparkle', 'dot', 'glow', 'star', 'image'].includes(trailSettings.trail_style)
      ? trailSettings.trail_style
      : 'sparkle';
    const size = clamp(trailSettings.trail_size, 2, 80, 13);

    if (style === 'image' && !trailSettings.trail_image_url) style = 'sparkle';

    el.className = `cursor-trail ${style} cursor-trail-runtime`;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.fontSize = `${size}px`;
    el.style.setProperty('--trail-duration', `${clamp(trailSettings.trail_fade_ms, 100, 3000, 520)}ms`);

    if (style === 'image') {
      const url = window.publicUrlForPath?.(trailSettings.trail_image_url || '') || '';
      if (url) el.style.backgroundImage = `url("${cssUrl(url)}")`;
    }

    layer.appendChild(el);
    el.addEventListener('animationend', () => el.remove(), { once: true });
    setTimeout(() => el.remove(), clamp(trailSettings.trail_fade_ms, 100, 3000, 520) + 200);
  }

  function reactivateAfterEnter() {
    const layer = ensureFxLayer();
    layer.style.setProperty('display', 'block', 'important');
    layer.style.setProperty('visibility', 'visible', 'important');
    layer.style.setProperty('opacity', '1', 'important');
    last = { x: -9999, y: -9999 };
  }

  installStyle();
  ensureFxLayer();

  document.addEventListener('pointermove', event => {
    createTrail(event.clientX, event.clientY);
  }, { passive: true, capture: true });

  const enter = document.getElementById('enterButton');
  enter?.addEventListener('click', () => {
    reactivateAfterEnter();
    requestAnimationFrame(reactivateAfterEnter);
    setTimeout(reactivateAfterEnter, 100);
    setTimeout(reactivateAfterEnter, 700);
  }, true);

  window.addEventListener('pageshow', reactivateAfterEnter);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) reactivateAfterEnter();
  });

  loadSettings();
})();