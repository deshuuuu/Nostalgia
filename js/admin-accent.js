(function () {
  'use strict';

  const cfg = window.APP_CONFIG || {};
  let timer = null;
  let initialized = false;

  function normalizeHex(value, fallback = '#d9d0a4') {
    const v = String(value || '').trim();
    return /^#[0-9a-f]{6}$/i.test(v) ? v : fallback;
  }

  async function fetchSettings() {
    const { data, error } = await window.db
      .from('site_content')
      .select('settings_json')
      .eq('id', cfg.siteId || 1)
      .single();
    if (error) throw error;
    return data?.settings_json || {};
  }

  async function persist() {
    const input = document.getElementById('accentColorInput');
    if (!input) return;
    const accent = normalizeHex(input.value);
    const settings = await fetchSettings();
    const merged = { ...settings, accent_color: accent };
    const { error } = await window.db
      .from('site_content')
      .update({ settings_json: merged, updated_at: new Date().toISOString() })
      .eq('id', cfg.siteId || 1);
    if (error) throw error;
    const status = document.getElementById('saveStatus');
    if (status) status.textContent = '포인트 컬러 저장됨';
  }

  function schedule(delay = 120) {
    clearTimeout(timer);
    const status = document.getElementById('saveStatus');
    if (status) status.textContent = '포인트 컬러 저장 중…';
    timer = setTimeout(() => persist().catch(error => {
      console.error(error);
      if (status) status.textContent = '오류';
    }), delay);
  }

  async function init() {
    if (initialized || !window.db || !window.SUPABASE_CONFIGURED) return;
    const app = document.getElementById('adminApp');
    if (!app || app.classList.contains('hidden')) return;
    const input = document.getElementById('accentColorInput');
    if (!input) return;
    initialized = true;

    try {
      const settings = await fetchSettings();
      input.value = normalizeHex(settings.accent_color);
    } catch (error) {
      console.error(error);
    }

    // Own accent saving exclusively so the legacy autosave cannot write a stale settings snapshot afterward.
    ['input', 'change'].forEach(type => {
      input.addEventListener(type, event => {
        event.stopImmediatePropagation();
        schedule(type === 'input' ? 80 : 20);
      }, true);
    });

    document.getElementById('saveAllButton')?.addEventListener('click', () => {
      setTimeout(() => persist().catch(console.error), 950);
    });
  }

  const poll = setInterval(() => {
    init();
    if (initialized) clearInterval(poll);
  }, 250);
  setTimeout(() => clearInterval(poll), 30000);
})();
