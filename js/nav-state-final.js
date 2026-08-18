(function () {
  'use strict';

  function syncNav(page) {
    const buttons = [...document.querySelectorAll('.top-nav .nav-button[data-page]')];
    buttons.forEach(button => {
      const active = button.dataset.page === page;
      button.classList.toggle('active', active);
      button.setAttribute('aria-current', active ? 'page' : 'false');
      if (!active) button.blur();
    });
  }

  function currentPage() {
    const panel = document.querySelector('[data-page-panel].active');
    if (panel?.dataset?.pagePanel) return panel.dataset.pagePanel;
    const hash = location.hash.replace('#', '');
    return ['home', 'profile', 'story', 'gallery'].includes(hash) ? hash : 'home';
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('.nav-button[data-page]');
    if (!button) return;
    const page = button.dataset.page;
    requestAnimationFrame(() => {
      syncNav(page);
      button.blur();
    });
    setTimeout(() => syncNav(currentPage()), 60);
  }, true);

  window.addEventListener('hashchange', () => syncNav(currentPage()));
  window.addEventListener('pageshow', () => syncNav(currentPage()));

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => syncNav(currentPage()), { once: true });
  } else {
    syncNav(currentPage());
  }
})();
