(function () {
  'use strict';

  const cfg = window.APP_CONFIG || {};

  function normalizeHex(value, fallback) {
    const v = String(value || '').trim();
    return /^#[0-9a-f]{6}$/i.test(v) ? v : fallback;
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

  function applyBackground(settings) {
    const base = normalizeHex(settings.background_color, '#55564f');
    const start = normalizeHex(settings.background_gradient_start, base);
    const end = normalizeHex(settings.background_gradient_end, base);
    const angleRaw = Number(settings.background_gradient_angle ?? 180);
    const angle = Number.isFinite(angleRaw) ? Math.max(0, Math.min(360, angleRaw)) : 180;
    const enabled = settings.background_gradient_enabled === true;

    document.documentElement.style.setProperty('--bg', base);
    document.documentElement.style.setProperty('--bg-deep', end);
    document.documentElement.style.setProperty('--bg-gradient-start', start);
    document.documentElement.style.setProperty('--bg-gradient-end', end);
    document.documentElement.style.setProperty('--bg-gradient-angle', `${angle}deg`);

    document.body.style.backgroundColor = base;
    document.body.style.backgroundImage = enabled
      ? `linear-gradient(${angle}deg, ${start}, ${end})`
      : 'none';
    document.body.style.backgroundAttachment = enabled ? 'fixed' : 'scroll';
  }

  async function boot() {
    const settings = await fetchSettings();
    applyBackground(settings);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 80), { once: true });
  } else {
    setTimeout(boot, 80);
  }
})();
