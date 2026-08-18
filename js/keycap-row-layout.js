(function () {
  'use strict';

  function apply(attempt = 0) {
    const widget = document.getElementById('keycapWidget');
    const mount = document.getElementById('keycapMount');
    const root = mount?.shadowRoot;

    if (!widget || !root) {
      if (attempt < 60) setTimeout(() => apply(attempt + 1), 100);
      return;
    }

    const addButton = root.querySelector('.add-keycap');
    const container = root.querySelector('.keycap-container');
    if (!container) {
      if (attempt < 60) setTimeout(() => apply(attempt + 1), 100);
      return;
    }

    if (root.querySelector('#keycap-row-layout-style')) return;

    /* Add all four keycaps immediately, then remove the old + control. */
    if (addButton) {
      for (let i = container.children.length; i < 4; i += 1) {
        if (addButton.disabled) break;
        addButton.click();
      }
      addButton.remove();
    }

    const style = document.createElement('style');
    style.id = 'keycap-row-layout-style';
    style.textContent = `
      .dynamic-shell {
        width: 100% !important;
        padding: 10px 4px 13px !important;
      }
      .keycap-container {
        display: flex !important;
        flex-wrap: nowrap !important;
        justify-content: center !important;
        align-items: flex-start !important;
        gap: 9px !important;
        width: 100% !important;
      }
      .dynamic-keycap {
        flex: 0 0 52px !important;
        width: 52px !important;
        height: 52px !important;
        border-width: 1px !important;
        border-radius: 8px 8px 11px 11px !important;
        box-shadow:
          0 7px 0 var(--shadow-color,#A660A7),
          0 10px 13px rgba(0,0,0,.15) !important;
        font-size: 15px !important;
      }
      .dynamic-keycap img {
        width: 50px !important;
        height: 50px !important;
        border-radius: 7px 7px 9px 9px !important;
      }
      .dynamic-keycap:active,
      .dynamic-keycap.pressed {
        top: 5px !important;
        box-shadow:
          0 2px 0 var(--shadow-color,#A660A7),
          0 3px 4px rgba(0,0,0,.2) !important;
      }
    `;
    root.appendChild(style);

    /* Keep the floating window compact while leaving enough room for four keys. */
    widget.style.width = '274px';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(apply, 220), { once: true });
  } else {
    setTimeout(apply, 220);
  }
})();
