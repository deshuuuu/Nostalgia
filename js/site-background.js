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
    const end = normalizeHex(settings.background_gradient_end, '#3f413c');
    const angleRaw = Number(settings.background_gradient_angle ?? 180);
    const angle = Number.isFinite(angleRaw) ? Math.max(0, Math.min(360, angleRaw)) : 180;
    const enabled = settings.background_gradient_enabled !== false;

    document.documentElement.style.setProperty('--bg', base);
    document.documentElement.style.setProperty('--bg-gradient-start', start);
    document.documentElement.style.setProperty('--bg-gradient-end', end);
    document.documentElement.style.setProperty('--bg-gradient-angle', `${angle}deg`);
    document.body.style.backgroundColor = base;

    const textureLayers = [
      'radial-gradient(circle at 16% 5%, color-mix(in srgb, var(--accent) 14%, transparent), transparent 28%)',
      'radial-gradient(circle at 84% 18%, rgba(255,255,255,.05), transparent 22%)',
      'linear-gradient(120deg, rgba(255,255,255,.018) 0 1px, transparent 1px 12px)'
    ];

    if (enabled) {
      textureLayers.push(`linear-gradient(${angle}deg, ${start}, ${end})`);
    }

    document.body.style.backgroundImage = textureLayers.join(',');
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
