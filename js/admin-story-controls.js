(function () {
  'use strict';

  const cfg = window.APP_CONFIG || {};
  let loaded = false;
  let loading = false;
  let storySnapshot = [];
  let storyDraft = [];
  let settingsSnapshot = {};
  let storyDirty = false;
  let rendering = false;

  const $ = (s, root = document) => root.querySelector(s);

  function cloneStory(list) {
    return Array.isArray(list)
      ? list.map(item => ({
          title: String(item?.title || ''),
          body: String(item?.body || ''),
          locked: Boolean(item?.locked)
        }))
      : [];
  }

  function markDirty() {
    storyDirty = true;
    const status = $('#saveStatus');
    if (status && !/저장 중|업로드/.test(status.textContent || '')) status.textContent = '저장 필요';
  }

  function addSiteControls() {
    const card = $('[data-tab-panel="site"] .admin-card');
    if (!card || $('#homeEyebrowInput')) return;

    const anchor = $('#entryKickerInput')?.closest('label') || card.firstElementChild;
    const wrap = document.createElement('div');
    wrap.id = 'archiveTextControls';
    wrap.style.cssText = 'margin:14px 0 16px;padding:14px;border:1px solid rgba(226,220,190,.18);background:rgba(255,255,255,.02)';
    wrap.innerHTML = `
      <h3 style="margin:0 0 12px">HOME / FOOTER 문구</h3>
      <label>HOME 상단 문구<input id="homeEyebrowInput" type="text" placeholder="WELCOME TO THE ARCHIVE"></label>
      <label>하단 ARCHIVE 문구<input id="footerArchiveInput" type="text" placeholder="Nostalgia ARCHIVE"></label>
      <p class="muted" style="margin-bottom:0">HOME의 작은 영문 문구와 페이지 맨 아래 ARCHIVE 문구를 직접 바꿀 수 있습니다.</p>`;
    if (anchor?.parentNode) anchor.parentNode.insertBefore(wrap, anchor);
    else card.appendChild(wrap);

    const home = $('#homeEyebrowInput');
    const footer = $('#footerArchiveInput');
    home.value = settingsSnapshot.home_eyebrow ?? 'WELCOME TO THE ARCHIVE';
    footer.value = settingsSnapshot.footer_archive_text ?? '';
    [home, footer].forEach(input => {
      input.addEventListener('input', () => {
        const status = $('#saveStatus');
        if (status) status.textContent = '저장 필요';
      });
      input.addEventListener('change', () => {
        const status = $('#saveStatus');
        if (status) status.textContent = '저장 필요';
      });
    });
  }

  function addStoryPasswordControl() {
    const card = $('[data-tab-panel="story"] .admin-card');
    if (!card || $('#storyPasswordInput')) return;

    const box = document.createElement('div');
    box.id = 'storyLockSettings';
    box.style.cssText = 'margin:0 0 18px;padding:14px;border:1px solid rgba(226,220,190,.18);background:rgba(255,255,255,.02)';
    box.innerHTML = `
      <h3 style="margin:0 0 10px">스토리 잠금</h3>
      <label>잠금 챕터 비밀번호<input id="storyPasswordInput" type="text" autocomplete="off" placeholder="비밀번호 입력"></label>
      <p class="muted">아래에서 ‘비밀번호 필요’를 체크한 챕터만 이 비밀번호를 입력해야 본문이 보입니다.</p>
      <p class="muted" style="margin-bottom:0">본문 서식: <code>*기울임*</code> / <code>**굵게**</code></p>`;
    card.insertBefore(box, card.firstChild);

    const input = $('#storyPasswordInput');
    input.value = settingsSnapshot.story_password ?? '';
    input.addEventListener('input', () => {
      const status = $('#saveStatus');
      if (status) status.textContent = '저장 필요';
    });
    input.addEventListener('change', () => {
      const status = $('#saveStatus');
      if (status) status.textContent = '저장 필요';
    });
  }

  function makeStoryRow(chapter, index) {
    const row = document.createElement('div');
    row.className = 'editor-row story-row story-managed-row';
    row.dataset.storyIndex = String(index);

    const title = document.createElement('input');
    title.className = 'story-title';
    title.type = 'text';
    title.placeholder = '챕터 제목';
    title.value = chapter.title || '';

    const remove = document.createElement('button');
    remove.className = 'remove-button';
    remove.type = 'button';
    remove.title = '삭제';
    remove.textContent = '×';

    const lockLabel = document.createElement('label');
    lockLabel.className = 'check-row story-lock-row';
    lockLabel.style.cssText = 'grid-column:1 / -1;margin:2px 0 4px;padding:8px 10px;border:1px solid rgba(226,220,190,.14);background:rgba(255,255,255,.018)';
    const locked = document.createElement('input');
    locked.className = 'story-locked';
    locked.type = 'checkbox';
    locked.checked = Boolean(chapter.locked);
    lockLabel.append(locked, document.createTextNode(' 비밀번호 필요 🔒'));

    const body = document.createElement('textarea');
    body.className = 'story-body';
    body.rows = 9;
    body.placeholder = '스토리 본문';
    body.value = chapter.body || '';

    title.addEventListener('input', event => {
      if (rendering || !event.isTrusted) return;
      storyDraft[index].title = title.value;
      markDirty();
    });
    body.addEventListener('input', event => {
      if (rendering || !event.isTrusted) return;
      storyDraft[index].body = body.value;
      markDirty();
    });
    locked.addEventListener('change', event => {
      if (rendering || !event.isTrusted) return;
      storyDraft[index].locked = locked.checked;
      markDirty();
    });
    remove.addEventListener('click', event => {
      if (!event.isTrusted) return;
      storyDraft.splice(index, 1);
      markDirty();
      renderStoryEditor();
    });

    row.append(title, remove, lockLabel, body);
    return row;
  }

  function renderStoryEditor() {
    const editor = $('#storyEditor');
    if (!editor || !loaded) return;
    rendering = true;
    editor.innerHTML = '';

    if (!storyDraft.length) {
      const empty = document.createElement('div');
      empty.className = 'story-admin-empty muted';
      empty.style.cssText = 'padding:18px;border:1px dashed rgba(226,220,190,.18);text-align:center';
      empty.textContent = '등록된 스토리 챕터가 없습니다. + 챕터 추가로 새 챕터를 만들 수 있습니다.';
      editor.appendChild(empty);
    } else {
      storyDraft.forEach((chapter, index) => editor.appendChild(makeStoryRow(chapter, index)));
    }

    rendering = false;
  }

  function bindAddButton() {
    const button = $('#addStoryChapter');
    if (!button || button.dataset.storyManaged === '1') return;
    button.dataset.storyManaged = '1';

    button.addEventListener('click', event => {
      if (!event.isTrusted) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      storyDraft.push({ title: '', body: '', locked: false });
      markDirty();
      renderStoryEditor();
      $('#storyEditor .story-row:last-child .story-title')?.focus();
    }, true);
  }

  function restoreEditorIfMissing() {
    if (!loaded || rendering) return;
    const editor = $('#storyEditor');
    if (!editor) return;
    const expectedRows = storyDraft.length;
    const actualRows = editor.querySelectorAll('.story-managed-row').length;
    if ((expectedRows && actualRows !== expectedRows) || (!expectedRows && !editor.querySelector('.story-admin-empty'))) {
      renderStoryEditor();
    }
  }

  async function loadLatest(force = false) {
    if ((!force && loaded) || loading || !window.db || !window.SUPABASE_CONFIGURED) return;
    loading = true;
    try {
      const { data, error } = await window.db
        .from('site_content')
        .select('story_json,settings_json')
        .eq('id', cfg.siteId || 1)
        .single();
      if (error) throw error;
      storySnapshot = cloneStory(data?.story_json);
      storyDraft = cloneStory(storySnapshot);
      settingsSnapshot = data?.settings_json || {};
      loaded = true;
      storyDirty = false;
      addSiteControls();
      addStoryPasswordControl();
      bindAddButton();
      renderStoryEditor();
    } catch (error) {
      console.warn('스토리 관리자 데이터를 불러오지 못했습니다.', error);
    } finally {
      loading = false;
    }
  }

  async function activate() {
    const app = $('#adminApp');
    if (!app || app.classList.contains('hidden')) return;
    await loadLatest(false);
    addSiteControls();
    addStoryPasswordControl();
    bindAddButton();
    restoreEditorIfMissing();
  }

  const app = $('#adminApp');
  if (app) {
    const appObserver = new MutationObserver(() => {
      if (!app.classList.contains('hidden')) setTimeout(activate, 50);
    });
    appObserver.observe(app, { attributes: true, attributeFilter: ['class'] });
  }

  const storyPanel = $('[data-tab-panel="story"]');
  if (storyPanel) {
    const editorObserver = new MutationObserver(() => {
      if (!rendering) setTimeout(restoreEditorIfMissing, 0);
    });
    editorObserver.observe(storyPanel, { childList: true, subtree: true });
  }

  $('#adminNav [data-tab="story"]')?.addEventListener('click', () => {
    setTimeout(async () => {
      if (!loaded) await loadLatest(false);
      restoreEditorIfMissing();
    }, 80);
  });

  window.nostalgiaStoryGetDraft = () => cloneStory(storyDraft);
  window.nostalgiaStoryEditorLoaded = () => loaded;
  window.nostalgiaStoryWasEdited = () => storyDirty;
  window.nostalgiaStoryMarkSaved = story => {
    storySnapshot = cloneStory(story);
    storyDraft = cloneStory(storySnapshot);
    storyDirty = false;
    loaded = true;
    renderStoryEditor();
  };
  window.nostalgiaStoryReloadFromDb = () => loadLatest(true);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', activate, { once: true });
  } else {
    activate();
  }
})();