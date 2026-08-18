(function () {
  'use strict';

  const PLACEHOLDER = 'assets/placeholder-character.svg';
  const KEY_ORDER = ['Z', 'X', 'C', 'V'];
  const DEFAULT_KEYCAP_CONFIG = {
    Z: { image: 'https://i.imgur.com/FcyxREc.png', shadow: '#A660A7' },
    X: { image: 'https://i.imgur.com/GfHCsbM.png', shadow: '#A660A7' },
    C: { image: 'https://i.imgur.com/ZawxGiT.png', shadow: '#A660A7' },
    V: { image: 'https://i.imgur.com/VxCfK6k.png', shadow: '#A660A7' }
  };

  async function refreshEntry() {
    const img = document.getElementById('entryImage');
    if (!img || !window.db || !window.SUPABASE_CONFIGURED) return;

    try {
      const cfg = window.APP_CONFIG || {};
      const { data: row, error } = await window.db
        .from('site_content')
        .select('character_name,tagline,character_image_url,settings_json')
        .eq('id', cfg.siteId || 1)
        .single();
      if (error || !row) return;

      const settings = row.settings_json || {};
      const entryPath = String(settings.entry_image_url || '').trim();
      const characterPath = String(row.character_image_url || '').trim();
      const entryIsPlaceholder = !entryPath || /(?:^|\/)assets\/placeholder-character\.svg(?:\?.*)?$/i.test(entryPath) || entryPath === PLACEHOLDER;
      const chosenPath = entryIsPlaceholder && characterPath ? characterPath : (entryPath || characterPath || PLACEHOLDER);
      const chosenUrl = window.publicUrlForPath(chosenPath) || window.publicUrlForPath(characterPath) || PLACEHOLDER;

      img.onerror = function () {
        img.onerror = null;
        const fallback = characterPath && characterPath !== chosenPath
          ? window.publicUrlForPath(characterPath)
          : new URL(PLACEHOLDER, window.SITE_BASE_URL || location.href).href;
        if (fallback) img.src = fallback;
      };
      img.src = chosenUrl;

      const kicker = document.getElementById('entryKicker');
      const title = document.getElementById('entryTitle');
      const tagline = document.getElementById('entryTagline');
      const note = document.getElementById('entryNote');
      const enter = document.getElementById('enterButton');
      if (kicker) kicker.textContent = settings.entry_kicker || 'A MEMORY, KEPT QUIETLY.';
      if (title) title.textContent = row.character_name || 'CHARACTER';
      if (tagline) tagline.textContent = row.tagline || '';
      if (note) note.textContent = settings.entry_note || '브라우저 정책상 ENTER 이후 음악이 재생됩니다. (AI 제작 음악)';
      if (enter) enter.textContent = settings.enter_label || 'ENTER';
    } catch (error) {
      console.warn('첫 화면 이미지 보정에 실패했습니다.', error);
    }
  }

  function cloneDefaultKeycaps() {
    return JSON.parse(JSON.stringify(DEFAULT_KEYCAP_CONFIG));
  }

  function parseKeycapConfig(root) {
    const defaults = cloneDefaultKeycaps();
    const marker = root?.querySelector?.('[data-keycap-config]');
    const raw = marker?.getAttribute('data-keycap-config');
    if (!raw) return defaults;
    try {
      const parsed = JSON.parse(decodeURIComponent(raw));
      KEY_ORDER.forEach(key => {
        if (parsed?.[key]) defaults[key] = { ...defaults[key], ...parsed[key] };
      });
    } catch (_) {}
    return defaults;
  }

  function enhanceKeycapWidget(attempt = 0) {
    const mount = document.getElementById('keycapMount');
    const root = mount?.shadowRoot;
    if (!root) {
      if (attempt < 40) setTimeout(() => enhanceKeycapWidget(attempt + 1), 120);
      return;
    }
    if (root.host?.dataset?.enhancedKeycap === '1') return;

    const config = parseKeycapConfig(root);
    root.host.dataset.enhancedKeycap = '1';
    root.innerHTML = `
      <style>
        *{box-sizing:border-box}
        .dynamic-shell{display:flex;flex-direction:column;align-items:center;padding:8px 2px 4px;background:transparent;font-family:Georgia,"Times New Roman",serif}
        .add-keycap{min-width:54px;height:38px;padding:0 16px;margin:0 0 18px;border:1px solid rgba(231,224,192,.30);border-radius:5px;color:#eee7ca;background:linear-gradient(180deg,rgba(230,223,193,.13),rgba(255,255,255,.025)),#454741;box-shadow:inset 0 -3px 0 rgba(28,29,27,.34),0 5px 12px rgba(0,0,0,.16);cursor:pointer;font-size:20px;font-weight:700;transition:transform .08s ease,box-shadow .08s ease,opacity .15s ease}
        .add-keycap:hover{border-color:rgba(231,224,192,.52)}
        .add-keycap:active{transform:translateY(2px);box-shadow:inset 0 -1px 0 rgba(28,29,27,.34),0 2px 5px rgba(0,0,0,.15)}
        .add-keycap:disabled{opacity:.34;cursor:not-allowed}
        .keycap-container{display:flex;flex-wrap:wrap;gap:18px;justify-content:center;max-width:100%}
        .dynamic-keycap{position:relative;width:100px;height:100px;padding:0;background:linear-gradient(to bottom,#fdfdfd,#e6e6e6);border:2px solid #d1d1d1;border-radius:12px 12px 18px 18px;cursor:pointer;outline:none;user-select:none;touch-action:manipulation;box-shadow:0 12px 0 var(--shadow-color,#A660A7),0 15px 20px rgba(0,0,0,.15);transition:all .05s;display:flex;align-items:center;justify-content:center;overflow:visible;color:#393a36;font:700 22px Georgia,serif}
        .dynamic-keycap:active,.dynamic-keycap.pressed{top:10px;box-shadow:0 2px 0 var(--shadow-color,#A660A7),0 4px 5px rgba(0,0,0,.2)!important;background:linear-gradient(to bottom,#e6e6e6,#d9d9d9)!important}
        .dynamic-keycap img{width:96px;height:96px;object-fit:cover;pointer-events:none;border-radius:10px 10px 14px 14px;display:block}
        .dynamic-keycap .fallback{pointer-events:none}
      </style>
      <div class="dynamic-shell">
        <button class="add-keycap" type="button" aria-label="키캡 추가">+</button>
        <div class="keycap-container"></div>
      </div>`;

    const addBtn = root.querySelector('.add-keycap');
    const container = root.querySelector('.keycap-container');
    const active = new Map();
    let currentIndex = 0;

    function imageUrl(path) {
      if (!path) return '';
      return window.publicUrlForPath ? window.publicUrlForPath(path) : path;
    }

    function addNextKeycap() {
      if (currentIndex >= KEY_ORDER.length) return;
      const key = KEY_ORDER[currentIndex];
      const item = config[key] || {};
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'dynamic-keycap';
      button.dataset.key = key;
      button.style.setProperty('--shadow-color', item.shadow || '#A660A7');
      button.setAttribute('aria-label', `${key} 키캡`);

      const url = imageUrl(item.image);
      if (url) {
        const image = document.createElement('img');
        image.src = url;
        image.alt = `${key} 키캡`;
        image.onerror = () => {
          image.remove();
          const fallback = document.createElement('span');
          fallback.className = 'fallback';
          fallback.textContent = key;
          button.appendChild(fallback);
        };
        button.appendChild(image);
      } else {
        const fallback = document.createElement('span');
        fallback.className = 'fallback';
        fallback.textContent = key;
        button.appendChild(fallback);
      }

      container.appendChild(button);
      active.set(key, button);
      currentIndex += 1;
      if (currentIndex >= KEY_ORDER.length) addBtn.disabled = true;
    }

    addBtn.addEventListener('click', addNextKeycap);

    // site.js has its own document key handler. Capture first so sounds only fire
    // for keycaps that have actually been added with the + button.
    document.addEventListener('keydown', event => {
      const key = String(event.key || '').toUpperCase();
      if (!KEY_ORDER.includes(key)) return;
      if (event.repeat || ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) || document.activeElement?.isContentEditable) return;
      event.stopImmediatePropagation();
      const button = active.get(key);
      if (!button) return;
      button.classList.add('pressed');
      button.click();
    }, true);

    document.addEventListener('keyup', event => {
      const key = String(event.key || '').toUpperCase();
      if (!KEY_ORDER.includes(key)) return;
      event.stopImmediatePropagation();
      active.get(key)?.classList.remove('pressed');
    }, true);
  }

  function start() {
    setTimeout(refreshEntry, 80);
    setTimeout(() => enhanceKeycapWidget(0), 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
