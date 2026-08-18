(function () {
  'use strict';

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

    // First-screen/site settings now save automatically when the field is changed.
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

    // Media upload in admin.js used to require a second manual click on "전체 저장".
    // Detect a successful upload and persist the new Storage path automatically.
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
    });

    observer.observe(toast, { childList: true, characterData: true, subtree: true });

    // Make the behaviour clear in the UI.
    const sitePanel = document.querySelector('[data-tab-panel="site"] .admin-card');
    if (sitePanel && !document.getElementById('entryAutosaveHint')) {
      const hint = document.createElement('p');
      hint.id = 'entryAutosaveHint';
      hint.className = 'muted';
      hint.textContent = '첫 화면 설정은 입력 후 포커스를 옮기면 자동 저장됩니다. 이미지도 업로드 완료 후 자동 저장됩니다.';
      sitePanel.appendChild(hint);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 0), { once: true });
  } else {
    setTimeout(boot, 0);
  }
})();
