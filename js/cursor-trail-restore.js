(function () {
  'use strict';

  if (matchMedia('(pointer: coarse)').matches) return;

  const cfg = window.APP_CONFIG || {};
  const layer = document.getElementById('trailLayer');
  if (!layer) return;

  let trailSettings = {
    trail_style: 'sparkle',
    trail_spacing: 12,
    trail_size: 13,
    trail_fade_ms: 520,
    trail_image_url: ''
  };
  let last = { x: -9999, y: -9999 };

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

  function existingTrailAt(x, y) {
    const newest = layer.lastElementChild;
    if (!newest?.classList?.contains('cursor-trail')) return false;
    const left = parseFloat(newest.style.left);
    const top = parseFloat(newest.style.top);
    return Number.isFinite(left) && Number.isFinite(top) && Math.abs(left - x) < 1.5 && Math.abs(top - y) < 1.5;
  }

  function createTrail(x, y) {
    const spacing = clamp(trailSettings.trail_spacing, 2, 80, 12);
    if (Math.hypot(x - last.x, y - last.y) < spacing) return;
    last = { x, y };

    // site.js runs its pointermove listener first. If it already produced a trail,
    // do not add another one. This module only restores a missing trail.
    if (existingTrailAt(x, y)) return;

    const el = document.createElement('span');
    const style = ['sparkle', 'dot', 'glow', 'star', 'image'].includes(trailSettings.trail_style)
      ? trailSettings.trail_style
      : 'sparkle';
    const size = clamp(trailSettings.trail_size, 2, 80, 13);

    el.className = `cursor-trail ${style} cursor-trail-restored`;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.fontSize = `${size}px`;
    el.style.setProperty('--trail-duration', `${clamp(trailSettings.trail_fade_ms, 100, 3000, 520)}ms`);

    if (style === 'image') {
      const url = window.publicUrlForPath?.(trailSettings.trail_image_url || '') || '';
      if (url) el.style.backgroundImage = `url("${cssUrl(url)}")`;
      else el.className = 'cursor-trail sparkle cursor-trail-restored';
    }

    layer.appendChild(el);
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }

  // Keep the effect visible above the page, stars and widgets, but below the cursor itself.
  layer.style.setProperty('z-index', '19990', 'important');
  layer.style.setProperty('display', 'block', 'important');

  document.addEventListener('pointermove', event => {
    createTrail(event.clientX, event.clientY);
  }, { passive: true });

  loadSettings();
})();