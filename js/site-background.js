(function () {
  'use strict';

  const cfg = window.APP_CONFIG || {};
  let lastSettings = null;

  function normalizeHex(value, fallback) {
    const v = String(value || '').trim();
    return /^#[0-9a-f]{6}$/i.test(v) ? v : fallback;
  }

  function isEnabled(value) {
    return value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true';
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
      console.warn('배경 설정을 불러오지 못했습니다.', error);
      return {};
    }
  }

  function setBackground(el, base, image) {
    if (!el) return;
    el.style.setProperty('background-color', base, 'important');
    el.style.setProperty('background-image', image, 'important');
    el.style.setProperty('background-repeat', 'no-repeat', 'important');
    el.style.setProperty('background-size', 'cover', 'important');
  }

  function applyBackground(settings) {
    lastSettings = settings || {};

    const base = normalizeHex(settings.background_color, '#55564f');
    const start = normalizeHex(settings.background_gradient_start, base);
    const end = normalizeHex(settings.background_gradient_end, base);
    const angleRaw = Number(settings.background_gradient_angle ?? 180);
    const angle = Number.isFinite(angleRaw) ? Math.max(0, Math.min(360, angleRaw)) : 180;
    const enabled = isEnabled(settings.background_gradient_enabled);
    const image = enabled ? `linear-gradient(${angle}deg, ${start}, ${end})` : 'none';

    document.documentElement.style.setProperty('--bg', base);
    document.documentElement.style.setProperty('--bg-deep', end);
    document.documentElement.style.setProperty('--bg-gradient-start', start);
    document.documentElement.style.setProperty('--bg-gradient-end', end);
    document.documentElement.style.setProperty('--bg-gradient-angle', `${angle}deg`);
    document.documentElement.style.setProperty('--site-background-image', image);
    document.documentElement.style.setProperty('background-color', base, 'important');

    setBackground(document.body, base, image);
    document.body.style.setProperty('background-attachment', enabled ? 'fixed' : 'scroll', 'important');

    // The entry overlay previously had its own fixed gray gradient.
    // Force it to use the exact same color/gradient as the public page.
    setBackground(document.getElementById('entryOverlay'), base, image);

    // Also keep the intro card base in sync. The uploaded image can still sit above it.
    const entryVisual = document.querySelector('.entry-visual');
    if (entryVisual) entryVisual.style.setProperty('background-color', base, 'important');
  }

  async function boot() {
    const settings = await fetchSettings();
    applyBackground(settings);

    // Re-apply after the other site scripts finish rendering so no later shorthand
    // background declaration can replace the selected gradient.
    setTimeout(() => applyBackground(lastSettings || settings), 450);
    setTimeout(() => applyBackground(lastSettings || settings), 1400);
  }

  window.applySavedSiteBackground = function applySavedSiteBackground() {
    if (lastSettings) applyBackground(lastSettings);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 120), { once: true });
  } else {
    setTimeout(boot, 120);
  }

  window.addEventListener('pageshow', () => {
    if (lastSettings) setTimeout(() => applyBackground(lastSettings), 50);
  });
})();
