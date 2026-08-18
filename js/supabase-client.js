(function () {
  const cfg = window.APP_CONFIG || {};
  const configured = Boolean(
    window.supabase &&
    cfg.supabaseUrl && !cfg.supabaseUrl.includes('YOUR_PROJECT') &&
    cfg.supabaseAnonKey && !cfg.supabaseAnonKey.includes('YOUR_')
  );

  window.SUPABASE_CONFIGURED = configured;
  window.db = configured
    ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      })
    : null;

  const scriptEl = [...document.scripts].find(s => /js\/supabase-client\.js(?:\?.*)?$/.test(s.src));
  const siteBaseUrl = scriptEl ? new URL('../', scriptEl.src) : new URL('./', location.href);
  window.SITE_BASE_URL = siteBaseUrl.href;

  window.publicUrlForPath = function (path) {
    if (!path) return '';
    if (/^(https?:|data:|blob:)/i.test(path)) return path;
    if (/^(assets|css|js)\//i.test(path)) return new URL(path, siteBaseUrl).href;
    if (/^\.\.?\//.test(path)) return new URL(path, location.href).href;
    if (!window.db) return path;
    const { data } = window.db.storage.from(cfg.storageBucket || 'site-media').getPublicUrl(path);
    return data?.publicUrl || '';
  };

  // Admin-only helper: make first-screen settings and media uploads auto-save.
  if (/\/admin\/?(?:index\.html)?$/i.test(location.pathname)) {
    const helper = document.createElement('script');
    helper.src = new URL('js/admin-autosave.js?v=20260818-1', siteBaseUrl).href;
    document.head.appendChild(helper);
  }
})();
