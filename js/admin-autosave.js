(function () {
  'use strict';

  const KEY_ORDER = ['Z', 'X', 'C', 'V'];
  const DEFAULT_KEYCAP_CONFIG = {
    Z: { image: 'https://i.imgur.com/FcyxREc.png', shadow: '#A660A7' },
    X: { image: 'https://i.imgur.com/GfHCsbM.png', shadow: '#A660A7' },
    C: { image: 'https://i.imgur.com/ZawxGiT.png', shadow: '#A660A7' },
    V: { image: 'https://i.imgur.com/VxCfK6k.png', shadow: '#A660A7' }
  };

  function cloneDefaultConfig() {
    return JSON.parse(JSON.stringify(DEFAULT_KEYCAP_CONFIG));
  }

  function boot() {
    const saveButton = document.querySelector('#saveAllButton');
    const toast = document.querySelector('#toast');
    if (!saveButton || !toast) return;

    let saveTimer = null;
    let uploadSavePending = false;

    function requestSave(delay = 250) {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        if (!saveButton.disabled) {
          saveButton.click();
        } else {
          requestSave(350);
        }
      }, delay);
    }

    const autoSaveIds = [
      'entryKickerInput',
      'entryNoteInput',
      'siteTitleInput',
      'enterLabelInput',
      'accentColorInput',
      'backgroundColorInput'
    ];

    autoSaveIds.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('change', () => requestSave(120));
    });

    const keycapSoundState = Object.fromEntries(KEY_ORDER.map(key => [key, null]));

    const observer = new MutationObserver(() => {
      const message = (toast.textContent || '').trim();
      if (!message) return;

      if (message.includes('파일 업로드 완료') && message.includes('전체 저장')) {
        if (uploadSavePending) return;
        uploadSavePending = true;
        toast.textContent = '파일 업로드 완료. 자동 저장 중…';
        requestSave(180);
        setTimeout(() => { uploadSavePending = false; }, 1600);
      }

      KEY_ORDER.forEach(key => {
        if (message.includes(`${key} 키 음원이 업로드되었습니다`)) {
          keycapSoundState[key] = true;
          updateKeycapSoundLabels();
          requestSave(180);
        }
      });
    });

    observer.observe(toast, { childList: true, characterData: true, subtree: true });

    const sitePanel = document.querySelector('[data-tab-panel="site"] .admin-card');
    if (sitePanel && !document.getElementById('entryAutosaveHint')) {
      const hint = document.createElement('p');
      hint.id = 'entryAutosaveHint';
      hint.className = 'muted';
      hint.textContent = '첫 화면 설정은 입력 후 포커스를 옮기면 자동 저장됩니다. 이미지도 업로드 완료 후 자동 저장됩니다.';
      sitePanel.appendChild(hint);
    }

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
        #visualKeycapDesigner .kc-color{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:11px}
        #visualKeycapDesigner .kc-color input{width:64px;height:32px;padding:2px;border:1px solid rgba(226,220,190,.26);background:transparent}
        #visualKeycapDesigner .kc-status{font-size:10px;color:#aaa89b}
        #visualKeycapDesigner .kc-note{margin-top:18px;padding:12px 14px;border-left:2px solid var(--accent,#d9d0a4);background:rgba(255,255,255,.025);color:#b9b5a6;font-size:11px;line-height:1.7}
        @media(max-width:850px){#visualKeycapDesigner .kc-grid{grid-template-columns:1fr}}
      </style>
      <div class="kc-head">
        <div>
          <h3 style="margin:0">키캡 클리커 설정</h3>
          <p class="muted">공개 위젯의 + 버튼을 누르면 Z → X → C → V 순서로 키캡이 추가됩니다.</p>
        </div>
      </div>
      <div class="kc-grid" id="visualKeycapGrid"></div>
      <div class="kc-note">각 키캡의 이미지는 직접 업로드할 수 있고, 아래쪽 입체 그림자 색은 컬러 피커로 바꿀 수 있습니다. 사운드는 키별로 따로 업로드됩니다. 변경 내용은 자동 저장됩니다.</div>`;
    grid.prepend(designer);

    let config = cloneDefaultConfig();
    let initializedFromEditor = false;

    function parseConfigFromEditor() {
      const raw = textarea.value || '';
      const match = raw.match(/data-keycap-config=["']([^"']+)["']/i);
      if (!match) return cloneDefaultConfig();
      try {
        const parsed = JSON.parse(decodeURIComponent(match[1]));
        const merged = cloneDefaultConfig();
        KEY_ORDER.forEach(key => {
          if (parsed?.[key]) merged[key] = { ...merged[key], ...parsed[key] };
        });
        return merged;
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
      if (save) requestSave(140);
    }

    function publicUrl(path) {
      if (!path) return '';
      return window.publicUrlForPath ? window.publicUrlForPath(path) : path;
    }

    async function uploadKeycapImage(file, key) {
      if (!file || !window.db) return;
      const cfg = window.APP_CONFIG || {};
      const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
      const path = `keycap/images/${key.toLowerCase()}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
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
      showToast(`${key} 키캡 이미지 업로드 완료. 자동 저장 중…`, 'success');
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
          <label class="kc-file">키캡 사운드<button type="button" class="secondary-button" data-sound-key="${key}">사운드 파일 선택</button></label>
          <label class="kc-color"><span>아래 그림자 색</span><input type="color" data-color-key="${key}" value="${/^#[0-9a-f]{6}$/i.test(item.shadow || '') ? item.shadow : '#A660A7'}"></label>`;

        card.append(preview, fields);
        root.appendChild(card);
      });

      root.querySelectorAll('[data-image-key]').forEach(input => {
        input.addEventListener('change', async () => {
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
        });
      });

      root.querySelectorAll('[data-sound-key]').forEach(button => {
        button.addEventListener('click', () => {
          const key = button.dataset.soundKey;
          const originalInput = document.querySelector(`.keycap-audio-file[data-key="${key}"]`);
          if (originalInput) originalInput.click();
        });
      });

      root.querySelectorAll('[data-color-key]').forEach(input => {
        input.addEventListener('input', () => {
          const key = input.dataset.colorKey;
          config[key].shadow = input.value;
          const card = input.closest('.kc-card');
          card?.querySelector('.kc-preview')?.style.setProperty('--kc-shadow', input.value);
        });
        input.addEventListener('change', () => {
          const key = input.dataset.colorKey;
          config[key].shadow = input.value;
          syncEditor({ save: true });
        });
      });
    }

    function initializeFromEditor() {
      if (!textarea.value) return;
      config = parseConfigFromEditor();
      renderDesigner();
      if (!/data-keycap-config=/i.test(textarea.value)) {
        syncEditor({ save: true });
      }
      initializedFromEditor = true;
    }

    window.updateKeycapSoundLabels = function updateKeycapSoundLabelsGlobal() {
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
        }, 160);
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

  function updateKeycapSoundLabels() {
    window.updateKeycapSoundLabels?.();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 0), { once: true });
  } else {
    setTimeout(boot, 0);
  }
})();
