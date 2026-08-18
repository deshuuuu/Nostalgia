(function () {
  'use strict';

  const targets = [
    { id: 'accentColorInput', label: '포인트 컬러' },
    { id: 'backgroundColorInput', label: '배경 컬러' },
    { id: 'backgroundGradientStartInput', label: '시작색' },
    { id: 'backgroundGradientEndInput', label: '끝색' }
  ];

  function normalizeHex(value) {
    let v = String(value || '').trim().toUpperCase();
    if (!v) return null;
    if (!v.startsWith('#')) v = `#${v}`;
    if (/^#[0-9A-F]{3}$/.test(v)) {
      v = `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
    }
    return /^#[0-9A-F]{6}$/.test(v) ? v : null;
  }

  function installStyle() {
    if (document.getElementById('adminHexColorStyle')) return;
    const style = document.createElement('style');
    style.id = 'adminHexColorStyle';
    style.textContent = `
      .admin-color-code-row {
        display: grid;
        grid-template-columns: 64px minmax(0, 1fr);
        gap: 9px;
        align-items: center;
      }
      .admin-color-code-row input[type="color"] {
        width: 64px !important;
        min-width: 64px;
        height: 46px;
        min-height: 46px;
        padding: 4px !important;
        cursor: pointer;
      }
      .admin-color-code-row .admin-hex-input {
        width: 100%;
        min-width: 0;
        height: 46px;
        font-family: "Cascadia Code", "SFMono-Regular", Consolas, monospace;
        font-size: 13px;
        letter-spacing: .07em;
        text-transform: uppercase;
      }
      .admin-color-code-row .admin-hex-input.invalid {
        border-color: rgba(224,165,160,.75) !important;
        box-shadow: 0 0 0 2px rgba(224,165,160,.10) !important;
      }
      .admin-color-code-hint {
        margin: -8px 0 4px;
        color: #9f9c92;
        font-size: 10px;
        font-family: "Cascadia Code", "SFMono-Regular", Consolas, monospace;
        letter-spacing: .03em;
      }
      @media (max-width: 560px) {
        .admin-color-code-row { grid-template-columns: 54px minmax(0, 1fr); }
        .admin-color-code-row input[type="color"] { width: 54px !important; min-width: 54px; }
      }
    `;
    document.head.append(style);
  }

  function dispatchColorEvents(colorInput) {
    colorInput.dispatchEvent(new Event('input', { bubbles: true }));
    colorInput.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function enhance(target) {
    const colorInput = document.getElementById(target.id);
    if (!colorInput || colorInput.dataset.hexEnhanced === '1') return false;
    colorInput.dataset.hexEnhanced = '1';

    const label = colorInput.closest('label');
    if (!label) return false;

    const row = document.createElement('div');
    row.className = 'admin-color-code-row';

    const hexInput = document.createElement('input');
    hexInput.type = 'text';
    hexInput.className = 'admin-hex-input';
    hexInput.id = `${target.id}Hex`;
    hexInput.autocomplete = 'off';
    hexInput.spellcheck = false;
    hexInput.inputMode = 'text';
    hexInput.maxLength = 7;
    hexInput.placeholder = '#D9D0A4';
    hexInput.setAttribute('aria-label', `${target.label} HEX 코드`);

    colorInput.parentNode.insertBefore(row, colorInput);
    row.append(colorInput, hexInput);

    const hint = document.createElement('div');
    hint.className = 'admin-color-code-hint';
    hint.textContent = 'HEX · #RRGGBB';
    row.insertAdjacentElement('afterend', hint);

    const syncFromPicker = () => {
      const normalized = normalizeHex(colorInput.value);
      if (!normalized) return;
      hexInput.value = normalized;
      hexInput.classList.remove('invalid');
    };

    const syncToPicker = (commit) => {
      const normalized = normalizeHex(hexInput.value);
      if (!normalized) {
        hexInput.classList.toggle('invalid', hexInput.value.trim().length > 0);
        if (commit) syncFromPicker();
        return;
      }
      hexInput.value = normalized;
      hexInput.classList.remove('invalid');
      if (colorInput.value.toUpperCase() !== normalized) {
        colorInput.value = normalized;
        dispatchColorEvents(colorInput);
      }
    };

    colorInput.addEventListener('input', syncFromPicker);
    colorInput.addEventListener('change', syncFromPicker);
    hexInput.addEventListener('input', () => syncToPicker(false));
    hexInput.addEventListener('change', () => syncToPicker(true));
    hexInput.addEventListener('blur', () => syncToPicker(true));
    hexInput.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        syncToPicker(true);
        hexInput.blur();
      }
    });

    syncFromPicker();
    return true;
  }

  function enhanceAll() {
    installStyle();
    targets.forEach(enhance);
  }

  const observer = new MutationObserver(enhanceAll);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enhanceAll, { once: true });
  } else {
    enhanceAll();
  }
})();