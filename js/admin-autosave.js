(function () {
  'use strict';

  const KEY_ORDER = ['Z', 'X', 'C', 'V'];
  const LEGACY_DEFAULT_IMAGES = new Set([
    'https://i.imgur.com/FcyxREc.png',
    'https://i.imgur.com/GfHCsbM.png',
    'https://i.imgur.com/ZawxGiT.png',
    'https://i.imgur.com/VxCfK6k.png'
  ]);

  const DEFAULT_KEYCAP_CONFIG = {
    Z: { image: '', shadow: '#A660A7' },
    X: { image: '', shadow: '#A660A7' },
    C: { image: '', shadow: '#A660A7' },
    V: { image: '', shadow: '#A660A7' }
  };

  function cloneDefaultConfig() {
    return JSON.parse(JSON.stringify(DEFAULT_KEYCAP_CONFIG));
  }

  function normalizeImage(value) {
    const image = String(value || '').trim();
    return LEGACY_DEFAULT_IMAGES.has(image) ? '' : image;
  }

  function normalizeConfig(parsed) {
    const merged = cloneDefaultConfig();
    KEY_ORDER.forEach(key => {
      if (!parsed?.[key]) return;
      merged[key] = {
        ...merged[key],
        ...parsed[key],
        image: normalizeImage(parsed[key].image)
      };
    });
    return merged;
  }

  function boot() {
    const toast = document.querySelector('#toast');
    if (!toast) return;

    let saveTimer = null;

    function requestSave(delay = 220) {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        window.nostalgiaAuthorizeAdminWrite?.(120000);
        if (typeof window.safeSaveNostalgiaAdmin === 'function') {
          window.safeSaveNostalgiaAdmin();
        }
      }, delay);
    }

    const autoSaveIds = [
      'entryKickerInput',
      'entryNoteInput',
      'siteTitleInput',
      'enterLabelInput',
      'accentColorInput'
    ];

    autoSaveIds.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('change', event => {
        if (!event.isTrusted) return;
        requestSave(120);
      });
    });

    const keycapSoundState = Object.fromEntries(KEY_ORDER.map(key => [key, null]));

    const observer = new MutationObserver(() => {
      const message = (toast.textContent || '').trim();
      if (!message) return;

      KEY_ORDER.forEach(key => {
        if (message.includes(`${key} 키 음원이 업로드되었습니다`)) {
          keycapSoundState[key] = true;
          window.updateKeycapSoundLabels?.();
          requestSave(220);
        }
      });
    });
    observer.observe(toast, { childList: true, characterData: true, subtree: true });

    setupKeycapDesigner(requestSave, toast, keycapSoundState);
  }

  function setupKeycapDesigner(requestSave, toast, keycapSoundState) {
    const panel = document.querySelector('[data-tab-panel="clicker"]');
    const grid = panel?.querySelector('.panel-grid');
    const textarea = document.getElementById('keycapHtmlInput');
    if (!panel || !grid || !textarea || document.getElementById('visualKeycapDesigner')) return;

    [...grid.children].forEach(card => { card.style.display = 'none'; });

    const designer = document.createElement('article');
    designer.id = 'visualKeycapDesigner';
    designer.className = 'admin-card';
    designer.style.gridColumn = '1 / -1';
    designer.innerHTML = `
      <style>
        #visualKeycapDesigner .kc-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin-bottom:22px}
        #visualKeycapDesigner .kc-head p{margin:6px 0 0}
        #visualKeycapDesigner .kc-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
        #visualKeycapDesigner .kc-card{display:grid;grid-template-columns:92px 1fr;gap:16px;padding:16px;border:1px solid rgba(226,220,190,.22);background:rgba(255,255,255,.025)}
        #visualKeycapDesigner .kc-preview{width:92px;height:92px;display:grid;place-items:center;border:1px solid rgba(226,220,190,.26);border-radius:10px;background:rgba(28,29,27,.28);overflow:hidden;box-shadow:0 8px 0 var(--kc-shadow,#A660A7),0 12px 18px rgba(0,0,0,.18)}
        #visualKeycapDesigner .kc-preview img{width:100%;height:100%;object-fit:cover;display:block}
        #visualKeycapDesigner .kc-preview span{font:700 30px Georgia,serif;color:#eee8cd}
        #visualKeycapDesigner .kc-fields{display:flex;flex-direction:column;gap:10px;min-width:0}
        #visualKeycapDesigner .kc-title{display:flex;align-items:center;justify-content:space-between;gap:10px}
        #visualKeycapDesigner .kc-title strong{font:700 18px Georgia,serif;color:#e9e2c6}
        #visualKeycapDesigner .kc-file{display:grid;grid-template-columns:1fr;gap:5px;font-size:11px}
        #visualKeycapDesigner .kc-file input[type=file]{width:100%}
        #visualKeycapDesigner .kc-image-actions{display:flex;gap:7px;align-items:center;flex-wrap:wrap}
        #visualKeycapDesigner .kc-color{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:11px}
        #visualKeycapDesigner .kc-color input{width:64px;height:32px;padding:2px;border:1px solid rgba(226,220,190,.26);background:transparent}
        #visualKeycapDesigner .kc-status{font-size:10px;color:#aaa89b}
        #visualKeycapDesigner .kc-note{margin-top:18px;padding:12px 14px;border-left:2px solid var(--accent,#d9d0a4);background:rgba(255,255,255,.025);color:#b9b5a6;font-size:11px;line-height:1.7}
        @media(max-width:850px){#visualKeycapDesigner .kc-grid{grid-template-columns:1fr}}
      </style>
      <div class="kc-head"><div><h3 style="margin:0">키캡 클리커 설정</h3><p class="muted">기본 이미지는 비어 있습니다. 필요한 키만 직접 이미지를 업로드하세요.</p></div></div>
      <div class="kc-grid" id="visualKeycapGrid"></div>
      <div class="kc-note">페이지를 열거나 스크립트가 업데이트되는 것만으로는 설정이 저장되지 않습니다. 실제로 이미지를 업로드하거나 색을 바꾸거나 비우기를 눌렀을 때만 저장됩니다.</div>`;
    grid.prepend(designer);

    let config = cloneDefaultConfig();
    let initializedFromEditor = false;

    function parseConfigFromEditor() {
      const raw = textarea.value || '';
      const match = raw.match(/data-keycap-config=["']([^"']+)["']/i);
      if (!match) return cloneDefaultConfig();
      try {
        return normalizeConfig(JSON.parse(decodeURIComponent(match[1])));
      } catch (_) {
        return cloneDefaultConfig();
      }
    }

    function serializeConfig() {
      return encodeURIComponent(JSON.stringify(config));
    }

    function syncEditor({ save = true } = {}) {
      textarea.value = `<div data-keycap-config="${serializeConfig()}"></div>`;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      if (save) requestSave(160);
    }

    function publicUrl(path) {
      return path ? (window.publicUrlForPath ? window.publicUrlForPath(path) : path) : '';
    }

    async function removeStoredImage(path) {
      if (!path || /^https?:\/\//i.test(path) || path.startsWith('assets/')) return;
      try {
        const cfg = window.APP_CONFIG || {};
        await window.db.storage.from(cfg.storageBucket || 'site-media').remove([path]);
      } catch (error) {
        console.warn('키캡 이미지 파일 정리 실패:', error);
      }
    }

    async function uploadKeycapImage(file, key) {
      if (!file || !window.db) return;
      const cfg = window.APP_CONFIG || {};
      const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
      const path = `keycap/images/${key.toLowerCase()}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
      const oldPath = normalizeImage(config[key]?.image);
      setDesignerStatus(`키캡 ${key} 이미지 업로드 중…`);
      const { error } = await window.db.storage.from(cfg.storageBucket || 'site-media').upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || undefined
      });
      if (error) throw error;
      config[key].image = path;
      renderDesigner();
      syncEditor({ save: true });
      await removeStoredImage(oldPath);
      showToast(`${key} 키캡 이미지가 저장되었습니다.`, 'success');
    }

    async function clearKeycapImage(key) {
      const oldPath = normalizeImage(config[key]?.image);
      config[key].image = '';
      renderDesigner();
      syncEditor({ save: true });
      await removeStoredImage(oldPath);
      showToast(`${key} 키캡 이미지를 비웠습니다.`, 'success');
    }

    function setDesignerStatus(text) {
      const saveStatus = document.getElementById('saveStatus');
      if (saveStatus) saveStatus.textContent = text;
    }

    function showToast(message, type) {
      toast.textContent = message;
      toast.className = `toast show ${type || ''}`;
      setTimeout(() => { toast.className = 'toast'; }, 2200);
    }

    function soundIsUploaded(key) {
      if (keycapSoundState[key] === true) return true;
      const status = document.getElementById('keycapAudioStatus')?.textContent || '';
      return status.includes(`${key} : 업로드됨`);
    }

    function renderDesigner() {
      const root = document.getElementById('visualKeycapGrid');
      if (!root) return;
      root.innerHTML = '';

      KEY_ORDER.forEach(key => {
        const item = config[key] || { image: '', shadow: '#A660A7' };
        item.image = normalizeImage(item.image);

        const card = document.createElement('div');
        card.className = 'kc-card';

        const preview = document.createElement('div');
        preview.className = 'kc-preview';
        preview.style.setProperty('--kc-shadow', item.shadow || '#A660A7');
        const url = publicUrl(item.image);
        if (url) {
          const img = document.createElement('img');
          img.src = url;
          img.alt = `${key} 키캡 미리보기`;
          img.onerror = () => { preview.innerHTML = `<span>${key}</span>`; };
          preview.appendChild(img);
        } else {
          preview.innerHTML = `<span>${key}</span>`;
        }

        const fields = document.createElement('div');
        fields.className = 'kc-fields';
        fields.innerHTML = `
          <div class="kc-title"><strong>${key}</strong><span class="kc-status" data-sound-status="${key}">${soundIsUploaded(key) ? '사운드 등록됨' : '사운드 미설정'}</span></div>
          <label class="kc-file">키캡 이미지<input type="file" accept="image/*" data-image-key="${key}"></label>
          <div class="kc-image-actions"><button type="button" class="ghost-button" data-clear-image-key="${key}" ${item.image ? '' : 'disabled'}>이미지 비우기</button></div>
          <label class="kc-file">키캡 사운드<button type="button" class="secondary-button" data-sound-key="${key}">사운드 파일 선택</button></label>
          <label class="kc-color"><span>아래 그림자 색</span><input type="color" data-color-key="${key}" value="${/^#[0-9a-f]{6}$/i.test(item.shadow || '') ? item.shadow : '#A660A7'}"></label>`;

        card.append(preview, fields);
        root.appendChild(card);
      });

      root.querySelectorAll('[data-image-key]').forEach(input => input.addEventListener('change', async event => {
        if (!event.isTrusted) return;
        const file = input.files?.[0];
        if (!file) return;
        const key = input.dataset.imageKey;
        try {
          await uploadKeycapImage(file, key);
        } catch (error) {
          console.error(error);
          showToast(error?.message || '키캡 이미지 업로드에 실패했습니다.', 'error');
        } finally {
          input.value = '';
        }
      }));

      root.querySelectorAll('[data-clear-image-key]').forEach(button => button.addEventListener('click', async event => {
        if (!event.isTrusted) return;
        await clearKeycapImage(button.dataset.clearImageKey);
      }));

      root.querySelectorAll('[data-sound-key]').forEach(button => button.addEventListener('click', event => {
        if (!event.isTrusted) return;
        const originalInput = document.querySelector(`.keycap-audio-file[data-key="${button.dataset.soundKey}"]`);
        if (originalInput) originalInput.click();
      }));

      root.querySelectorAll('[data-color-key]').forEach(input => {
        input.addEventListener('input', event => {
          if (!event.isTrusted) return;
          const key = input.dataset.colorKey;
          config[key].shadow = input.value;
          input.closest('.kc-card')?.querySelector('.kc-preview')?.style.setProperty('--kc-shadow', input.value);
        });
        input.addEventListener('change', event => {
          if (!event.isTrusted) return;
          config[input.dataset.colorKey].shadow = input.value;
          syncEditor({ save: true });
        });
      });
    }

    function initializeFromEditor() {
      if (initializedFromEditor) return;
      config = textarea.value ? parseConfigFromEditor() : cloneDefaultConfig();
      renderDesigner();
      // Important: loading/migrating the admin UI must never write defaults back to DB.
      initializedFromEditor = true;
    }

    window.updateKeycapSoundLabels = function () {
      KEY_ORDER.forEach(key => {
        const el = document.querySelector(`[data-sound-status="${key}"]`);
        if (el) el.textContent = soundIsUploaded(key) ? '사운드 등록됨' : '사운드 미설정';
      });
    };

    const adminApp = document.getElementById('adminApp');
    const appObserver = new MutationObserver(() => {
      if (!adminApp.classList.contains('hidden')) {
        setTimeout(() => {
          initializeFromEditor();
          window.updateKeycapSoundLabels?.();
        }, 180);
      }
    });
    appObserver.observe(adminApp, { attributes: true, attributeFilter: ['class'] });

    document.querySelector('#adminNav [data-tab="clicker"]')?.addEventListener('click', () => {
      setTimeout(() => {
        if (!initializedFromEditor) initializeFromEditor();
        else {
          config = parseConfigFromEditor();
          renderDesigner();
        }
        window.updateKeycapSoundLabels?.();
      }, 80);
    });

    renderDesigner();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 0), { once: true });
  } else {
    setTimeout(boot, 0);
  }
})();