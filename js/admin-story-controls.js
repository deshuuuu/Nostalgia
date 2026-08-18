(function () {
  'use strict';

  const cfg = window.APP_CONFIG || {};
  let loaded = false;
  let storySnapshot = [];
  let settingsSnapshot = {};

  function markDirty() {
    const status = document.getElementById('saveStatus');
    if (status && !/저장 중|업로드/.test(status.textContent || '')) status.textContent = '저장 필요';
  }

  function addSiteControls() {
    const card = document.querySelector('[data-tab-panel="site"] .admin-card');
    if (!card || document.getElementById('homeEyebrowInput')) return;

    const anchor = document.getElementById('entryKickerInput')?.closest('label') || card.firstElementChild;
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

    const home = document.getElementById('homeEyebrowInput');
    const footer = document.getElementById('footerArchiveInput');
    home.value = settingsSnapshot.home_eyebrow ?? 'WELCOME TO THE ARCHIVE';
    footer.value = settingsSnapshot.footer_archive_text ?? '';
    [home, footer].forEach(input => {
      input.addEventListener('input', markDirty);
      input.addEventListener('change', markDirty);
    });
  }

  function addStoryPasswordControl() {
    const card = document.querySelector('[data-tab-panel="story"] .admin-card');
    if (!card || document.getElementById('storyPasswordInput')) return;

    const box = document.createElement('div');
    box.id = 'storyLockSettings';
    box.style.cssText = 'margin:0 0 18px;padding:14px;border:1px solid rgba(226,220,190,.18);background:rgba(255,255,255,.02)';
    box.innerHTML = `
      <h3 style="margin:0 0 10px">스토리 잠금</h3>
      <label>잠금 챕터 비밀번호<input id="storyPasswordInput" type="text" autocomplete="off" placeholder="비밀번호 입력"></label>
      <p class="muted" style="margin-bottom:0">아래에서 ‘비밀번호 필요’를 체크한 챕터만 이 비밀번호를 입력해야 본문이 보입니다.</p>`;
    card.insertBefore(box, card.firstChild);

    const input = document.getElementById('storyPasswordInput');
    input.value = settingsSnapshot.story_password ?? '';
    input.addEventListener('input', markDirty);
    input.addEventListener('change', markDirty);
  }

  function decorateStoryRows() {
    const rows = [...document.querySelectorAll('.story-row')];
    rows.forEach((row, index) => {
      if (row.querySelector('.story-locked')) return;
      const title = row.querySelector('.story-title');
      const locked = Boolean(storySnapshot[index]?.locked);
      const label = document.createElement('label');
      label.className = 'check-row story-lock-row';
      label.style.cssText = 'grid-column:1 / -1;margin:2px 0 4px;padding:8px 10px;border:1px solid rgba(226,220,190,.14);background:rgba(255,255,255,.018)';
      label.innerHTML = `<input class="story-locked" type="checkbox" ${locked ? 'checked' : ''}> 비밀번호 필요 🔒`;
      const body = row.querySelector('.story-body');
      if (body) row.insertBefore(label, body);
      else if (title) title.after(label);
      else row.appendChild(label);
      label.querySelector('input').addEventListener('change', markDirty);
    });
  }

  async function loadLatest() {
    if (!window.db || !window.SUPABASE_CONFIGURED) return;
    try {
      const { data, error } = await window.db
        .from('site_content')
        .select('story_json,settings_json')
        .eq('id', cfg.siteId || 1)
        .single();
      if (error) throw error;
      storySnapshot = Array.isArray(data?.story_json) ? data.story_json : [];
      settingsSnapshot = data?.settings_json || {};
    } catch (error) {
      console.warn('스토리 잠금 설정을 불러오지 못했습니다.', error);
    }
  }

  async function activate() {
    const app = document.getElementById('adminApp');
    if (!app || app.classList.contains('hidden')) return;
    if (!loaded) {
      loaded = true;
      await loadLatest();
    }
    addSiteControls();
    addStoryPasswordControl();
    decorateStoryRows();
  }

  const observer = new MutationObserver(() => {
    const app = document.getElementById('adminApp');
    if (!app || app.classList.contains('hidden')) return;
    setTimeout(() => {
      addSiteControls();
      addStoryPasswordControl();
      decorateStoryRows();
    }, 0);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', activate, { once: true });
  } else {
    activate();
  }
})();