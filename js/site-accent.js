(function () {
  'use strict';

  const cfg = window.APP_CONFIG || {};

  function normalizeHex(value, fallback = '#d9d0a4') {
    const v = String(value || '').trim();
    return /^#[0-9a-f]{6}$/i.test(v) ? v : fallback;
  }

  function hexToRgb(hex) {
    const v = normalizeHex(hex).slice(1);
    return {
      r: parseInt(v.slice(0, 2), 16),
      g: parseInt(v.slice(2, 4), 16),
      b: parseInt(v.slice(4, 6), 16)
    };
  }

  function rgbToHex({ r, g, b }) {
    const c = n => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
    return `#${c(r)}${c(g)}${c(b)}`;
  }

  function mix(hex, target, amount) {
    const a = hexToRgb(hex);
    const b = hexToRgb(target);
    return rgbToHex({
      r: a.r + (b.r - a.r) * amount,
      g: a.g + (b.g - a.g) * amount,
      b: a.b + (b.b - a.b) * amount
    });
  }

  function clearNavInlineColors() {
    document.querySelectorAll('.top-nav .nav-button').forEach(button => {
      button.style.removeProperty('color');
      button.style.removeProperty('background');
      button.style.removeProperty('background-color');
    });
  }

  function applyAccent(accent) {
    const root = document.documentElement;
    const soft = mix(accent, '#ffffff', 0.24);
    const deep = mix(accent, '#000000', 0.28);

    root.style.setProperty('--accent', accent, 'important');
    root.style.setProperty('--accent-soft', soft, 'important');
    root.style.setProperty('--accent-deep', deep, 'important');

    const softSelectors = [
      '.entry-content h1',
      '.hero-copy h2',
      '.section-heading h2',
      '.profile-content h3',
      '.brand-button',
      '.story-card summary',
      '#widgetTrackTitle',
      '#musicWidget .widget-titlebar',
      '.primary-button',
      '.frame-caption'
    ];

    const directSelectors = [
      '.entry-kicker',
      '.eyebrow',
      '.profile-field dt',
      '.mini-label',
      '.status-dot',
      '.character-frame::after',
      '.story-card summary::after'
    ];

    softSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => el.style.setProperty('color', soft, 'important'));
    });

    // Navigation colors are intentionally NOT written inline.
    // The active page is styled exclusively by nav-active-only.css so old pages cannot stay gold.
    clearNavInlineColors();

    // Pseudo-elements cannot receive inline styles, but they already use --accent in CSS.
    directSelectors.filter(s => !s.includes('::')).forEach(selector => {
      document.querySelectorAll(selector).forEach(el => el.style.setProperty('color', accent, 'important'));
    });

    document.querySelectorAll('#musicWidget input[type="range"]').forEach(el => {
      el.style.setProperty('--range-accent', accent);
      el.style.setProperty('accent-color', accent, 'important');
    });
  }

  async function fetchAccent() {
    if (!window.db || !window.SUPABASE_CONFIGURED) return '#d9d0a4';
    try {
      const { data, error } = await window.db
        .from('site_content')
        .select('settings_json')
        .eq('id', cfg.siteId || 1)
        .single();
      if (error) throw error;
      return normalizeHex(data?.settings_json?.accent_color, '#d9d0a4');
    } catch (error) {
      console.warn('포인트 컬러를 불러오지 못했습니다.', error);
      return '#d9d0a4';
    }
  }

  async function boot() {
    const accent = await fetchAccent();
    applyAccent(accent);
    setTimeout(() => applyAccent(accent), 350);
    setTimeout(() => applyAccent(accent), 1200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 120), { once: true });
  } else {
    setTimeout(boot, 120);
  }
})();
