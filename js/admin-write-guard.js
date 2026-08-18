(function () {
  'use strict';

  if (!window.db || window.__nostalgiaAdminWriteGuardInstalled) return;
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

  function isInsideAdmin(target) {
    return Boolean(target?.closest?.('#adminApp'));
  }

  document.addEventListener('input', event => {
    if (!event.isTrusted || !isInsideAdmin(event.target)) return;
    authorize(event.target?.type === 'file' ? 600000 : 30000);
  }, true);

  document.addEventListener('change', event => {
    if (!event.isTrusted || !isInsideAdmin(event.target)) return;
    authorize(event.target?.type === 'file' ? 600000 : 60000);
  }, true);

  document.addEventListener('click', event => {
    if (!event.isTrusted || !isInsideAdmin(event.target)) return;
    if (event.target.closest('#adminNav')) return;
    if (event.target.closest('a')) return;
    const action = event.target.closest('button');
    if (action) authorize(120000);
  }, true);

  const adminApp = document.getElementById('adminApp');
  if (adminApp) {
    const observer = new MutationObserver(() => {
      if (!adminApp.classList.contains('hidden')) {
        // Login/navigation is not permission to write defaults back to the DB.
        clearAuthorization();
      }
    });
    observer.observe(adminApp, { attributes: true, attributeFilter: ['class'] });
  }

  function noopBuilder() {
    let proxy;
    proxy = new Proxy({}, {
      get(_target, prop) {
        if (prop === 'then') {
          return (resolve) => Promise.resolve({ data: null, error: null }).then(resolve);
        }
        if (prop === 'catch') return () => proxy;
        if (prop === 'finally') return () => proxy;
        return () => proxy;
      }
    });
    return proxy;
  }

  const originalFrom = window.db.from.bind(window.db);
  window.db.from = function guardedFrom(table) {
    const builder = originalFrom(table);
    if (table !== 'site_content') return builder;

    return new Proxy(builder, {
      get(target, prop, receiver) {
        if (prop === 'update') {
          return function guardedUpdate(payload, options) {
            if (!isAuthorized()) {
              console.warn('[Nostalgia admin] 초기화/자동 실행에 의한 site_content 쓰기를 차단했습니다.', payload);
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
})();