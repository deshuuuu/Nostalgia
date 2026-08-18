(function () {
  'use strict';

  const MIGRATION_KEY = 'character-home-widget-layout-v2';
  if (localStorage.getItem(MIGRATION_KEY)) return;

  /* Clear only the old saved positions once so the new safe defaults can take effect. */
  localStorage.removeItem('character-home-widget-music');
  localStorage.removeItem('character-home-widget-keycap');
  localStorage.setItem(MIGRATION_KEY, '1');
})();
