(function () {
  'use strict';

  const MIGRATION_KEY = 'character-home-widget-layout-v3';
  const musicKey = 'character-home-widget-music';
  const keycapKey = 'character-home-widget-keycap';

  if (!localStorage.getItem(MIGRATION_KEY)) {
    /* Clear only the old widget positions once so the new requested defaults take effect. */
    localStorage.removeItem(musicKey);
    localStorage.removeItem(keycapKey);
    localStorage.setItem(MIGRATION_KEY, '1');
  }

  const musicWidget = document.getElementById('musicWidget');
  const keycapWidget = document.getElementById('keycapWidget');

  /* Saved drag positions use explicit top/left values. Make sure the default
     bottom/right anchors do not fight those restored inline coordinates. */
  if (musicWidget && localStorage.getItem(musicKey)) {
    musicWidget.style.right = 'auto';
    musicWidget.style.bottom = 'auto';
  }
  if (keycapWidget && localStorage.getItem(keycapKey)) {
    keycapWidget.style.right = 'auto';
    keycapWidget.style.bottom = 'auto';
  }

  /* When a bottom/right anchored widget starts being dragged, freeze its current
     visual position into top/left coordinates first. This keeps dragging smooth. */
  [musicWidget, keycapWidget].forEach(widget => {
    if (!widget) return;
    const handle = widget.querySelector('.drag-handle');
    if (!handle) return;

    handle.addEventListener('pointerdown', event => {
      if (event.target.closest('button')) return;
      const rect = widget.getBoundingClientRect();
      widget.style.left = `${rect.left}px`;
      widget.style.top = `${rect.top}px`;
      widget.style.right = 'auto';
      widget.style.bottom = 'auto';
    }, true);
  });
})();
