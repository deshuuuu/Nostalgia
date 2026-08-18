(function () {
  'use strict';

  const dialog = document.getElementById('galleryDialog');
  if (!dialog) return;

  const style = document.createElement('style');
  style.id = 'galleryDialogCursorFixCss';
  style.textContent = `
    body.gallery-dialog-open #nostalgiaStableCursor,
    body.gallery-dialog-open #nostalgiaStableFxLayer {
      opacity: 0 !important;
      visibility: hidden !important;
    }

    body.custom-cursor-enabled.gallery-dialog-open #galleryDialog,
    body.custom-cursor-enabled.gallery-dialog-open #galleryDialog *,
    body.custom-cursor-enabled.gallery-dialog-open #galleryDialog::backdrop {
      cursor: auto !important;
    }
  `;
  document.head.appendChild(style);

  function sync() {
    const open = dialog.open;
    document.body.classList.toggle('gallery-dialog-open', open);

    if (!open) {
      requestAnimationFrame(() => {
        const pointer = document.getElementById('nostalgiaStableCursor');
        if (pointer) pointer.style.visibility = '';
      });
    }
  }

  const observer = new MutationObserver(sync);
  observer.observe(dialog, { attributes: true, attributeFilter: ['open'] });

  dialog.addEventListener('close', sync);
  dialog.addEventListener('cancel', () => setTimeout(sync, 0));
  sync();
})();
