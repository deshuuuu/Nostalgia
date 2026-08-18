(function () {
  'use strict';

  const cfg = window.APP_CONFIG || {};
  let rowData = null;
  let rendering = false;
  const unlockKey = `nostalgia-story-unlocked-${cfg.siteId || 1}`;

  function isUnlocked() {
    try { return sessionStorage.getItem(unlockKey) === '1'; }
    catch (_) { return false; }
  }

  function setUnlocked() {
    try { sessionStorage.setItem(unlockKey, '1'); }
    catch (_) {}
  }

  function installStyle() {
    if (document.getElementById('storyLockStyle')) return;
    const style = document.createElement('style');
    style.id = 'storyLockStyle';
    style.textContent = `
      .story-card.story-locked-card summary::before {
        content: 'LOCKED';
        flex: 0 0 auto;
        margin-right: 10px;
        padding: 3px 7px;
        border: 1px solid color-mix(in srgb, var(--accent) 34%, transparent);
        color: var(--accent);
        font-size: 8px;
        letter-spacing: .14em;
      }
      .story-lock-panel {
        padding: 0 4px 24px;
        color: #c3c0b2;
      }
      .story-lock-box {
        display: flex;
        align-items: center;
        gap: 8px;
        max-width: 520px;
        padding: 14px;
        border: 1px solid rgba(224,217,185,.16);
        background: rgba(255,255,255,.018);
      }
      .story-lock-box input {
        min-width: 0;
        flex: 1;
        height: 38px;
        padding: 0 11px;
        border: 1px solid rgba(224,217,185,.24);
        background: rgba(28,29,27,.26);
        color: #e7e1ca;
        outline: 0;
      }
      .story-lock-box input:focus { border-color: var(--accent); }
      .story-lock-box button {
        height: 38px;
        padding: 0 14px;
        border: 1px solid rgba(224,217,185,.30);
        background: rgba(224,217,185,.07);
        color: var(--accent-soft);
        font-family: var(--serif);
        font-size: 10px;
        letter-spacing: .08em;
      }
      .story-lock-message {
        margin: 9px 0 0;
        min-height: 1.4em;
        color: #aaa79b;
        font-size: 10px;
      }
      @media (max-width: 560px) {
        .story-lock-box { align-items: stretch; flex-direction: column; }
      }
    `;
    document.head.appendChild(style);
  }

  function applyArchiveLabels() {
    if (!rowData) return;
    const settings = rowData.settings_json || {};
    const heroEyebrow = document.querySelector('[data-page-panel="home"] .hero-copy .eyebrow');
    const footer = document.getElementById('footerName');
    if (heroEyebrow) heroEyebrow.textContent = settings.home_eyebrow ?? 'WELCOME TO THE ARCHIVE';
    if (footer) footer.textContent = settings.footer_archive_text || `${rowData.character_name || 'CHARACTER'} ARCHIVE`;
  }

  function makeOpenBody(chapter) {
    const body = document.createElement('div');
    body.className = 'story-body';
    body.textContent = chapter.body || '';
    return body;
  }

  function makeLockedPanel(chapter) {
    const panel = document.createElement('div');
    panel.className = 'story-lock-panel';
    const box = document.createElement('form');
    box.className = 'story-lock-box';
    box.innerHTML = `
      <input type="password" autocomplete="off" aria-label="스토리 비밀번호" placeholder="PASSWORD">
      <button type="submit">UNLOCK</button>`;
    const message = document.createElement('p');
    message.className = 'story-lock-message';
    message.textContent = '비밀번호가 필요한 기록입니다.';
    panel.append(box, message);

    box.addEventListener('submit', event => {
      event.preventDefault();
      const expected = String(rowData?.settings_json?.story_password || '');
      const typed = box.querySelector('input').value;
      if (!expected) {
        message.textContent = '관리자가 아직 비밀번호를 설정하지 않았습니다.';
        return;
      }
      if (typed !== expected) {
        message.textContent = '비밀번호가 맞지 않습니다.';
        box.querySelector('input').select();
        return;
      }
      setUnlocked();
      renderStory();
    });
    return panel;
  }

  function renderStory() {
    if (!rowData || rendering) return;
    const target = document.getElementById('storyList');
    if (!target) return;
    rendering = true;

    const chapters = Array.isArray(rowData.story_json) ? rowData.story_json : [];
    target.innerHTML = '';
    if (!chapters.length) {
      target.innerHTML = '<div class="gallery-empty">아직 등록된 스토리가 없습니다.</div>';
      rendering = false;
      return;
    }

    const unlocked = isUnlocked();
    chapters.forEach((chapter, index) => {
      const details = document.createElement('details');
      details.className = `story-card story-lock-managed${chapter.locked && !unlocked ? ' story-locked-card' : ''}`;
      if (index === 0 && !chapter.locked) details.open = true;

      const summary = document.createElement('summary');
      summary.textContent = chapter.title || `CHAPTER ${index + 1}`;
      details.appendChild(summary);

      if (chapter.locked && !unlocked) details.appendChild(makeLockedPanel(chapter));
      else details.appendChild(makeOpenBody(chapter));

      target.appendChild(details);
    });

    setTimeout(() => { rendering = false; }, 0);
  }

  function applyAll() {
    installStyle();
    applyArchiveLabels();
    renderStory();
  }

  async function load() {
    if (!window.SUPABASE_CONFIGURED || !window.db) return;
    try {
      const { data, error } = await window.db
        .from('site_content')
        .select('character_name,story_json,settings_json')
        .eq('id', cfg.siteId || 1)
        .single();
      if (error) throw error;
      rowData = data || {};
      applyAll();
      setTimeout(applyAll, 300);
      setTimeout(applyAll, 900);
      setTimeout(applyAll, 1800);
    } catch (error) {
      console.warn('스토리 잠금 설정을 불러오지 못했습니다.', error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', load, { once: true });
  } else {
    load();
  }
})();