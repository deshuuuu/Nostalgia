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

  // IMPORTANT: admin-autosave.js is loaded exactly once by admin/index.html.
  // Do not dynamically inject it here; duplicate listeners caused repeated saves.

  if (/\/admin\/?(?:index\.html)?$/i.test(location.pathname) && window.db && !window.__nostalgiaAdminWriteGuardInstalled) {
    window.__nostalgiaAdminWriteGuardInstalled = true;
    let authorizedUntil = 0;

    function authorize(ms) {
      authorizedUntil = Math.max(authorizedUntil, Date.now() + ms);
    }
    function isAuthorized() {
      return Date.now() <= authorizedUntil;
    }
    function clearAuthorization() {
      authorizedUntil = 0;
    }
    function insideAdmin(target) {
      return Boolean(target?.closest?.('#adminApp'));
    }

    document.addEventListener('input', event => {
      if (!event.isTrusted || !insideAdmin(event.target)) return;
      authorize(event.target?.type === 'file' ? 600000 : 30000);
    }, true);

    document.addEventListener('change', event => {
      if (!event.isTrusted || !insideAdmin(event.target)) return;
      authorize(event.target?.type === 'file' ? 600000 : 60000);
    }, true);

    document.addEventListener('click', event => {
      if (!event.isTrusted || !insideAdmin(event.target)) return;
      if (event.target.closest('#adminNav') || event.target.closest('a')) return;
      if (event.target.closest('button')) authorize(120000);
    }, true);

    const originalFrom = window.db.from.bind(window.db);
    function noopBuilder() {
      let proxy;
      proxy = new Proxy({}, {
        get(_target, prop) {
          if (prop === 'then') return resolve => Promise.resolve({ data: null, error: null }).then(resolve);
          if (prop === 'catch' || prop === 'finally') return () => proxy;
          return () => proxy;
        }
      });
      return proxy;
    }

    window.db.from = function guardedFrom(table) {
      const builder = originalFrom(table);
      if (table !== 'site_content') return builder;
      return new Proxy(builder, {
        get(target, prop, receiver) {
          if (prop === 'update') {
            return function guardedUpdate(payload, options) {
              if (!isAuthorized()) {
                console.warn('[Nostalgia admin] 페이지 초기화에 의한 설정 덮어쓰기를 차단했습니다.');
                return noopBuilder();
              }
              return target.update(payload, options);
            };
          }
          const value = Reflect.get(target, prop, receiver);
          return typeof value === 'function' ? value.bind(target) : value;
        }
      });
    };

    window.nostalgiaAuthorizeAdminWrite = authorize;
    window.nostalgiaClearAdminWriteAuthorization = clearAuthorization;

    document.addEventListener('DOMContentLoaded', () => {
      const app = document.getElementById('adminApp');
      if (!app) return;
      const observer = new MutationObserver(() => {
        if (!app.classList.contains('hidden')) clearAuthorization();
      });
      observer.observe(app, { attributes: true, attributeFilter: ['class'] });
    }, { once: true });
  }
})();