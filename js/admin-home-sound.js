(function () {
  'use strict';

  const cfg = window.APP_CONFIG || {};
  let currentPath = '';
  let busy = false;

  const $ = (selector, root = document) => root.querySelector(selector);

  function setStatus(text) {
    const el = $('#saveStatus');
    if (el) el.textContent = text;
  }

  function toast(message, type = 'success') {
    const el = $('#toast');
    if (!el) return;
    el.textContent = message;
    el.className = `toast show ${type}`;
    setTimeout(() => { el.className = 'toast'; }, 2600);
  }

  function publicUrl(path) {
    if (!path) return '';
    return window.publicUrlForPath ? window.publicUrlForPath(path) : path;
  }

  function safeName(name) {
    return String(name || 'sound')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 90) || 'sound';
  }

  function ensureCard() {
    const grid = $('[data-tab-panel="audio"] .panel-grid');
    if (!grid || $('#homeSoundCard')) return;

    const card = document.createElement('article');
    card.id = 'homeSoundCard';
    card.className = 'admin-card';
    card.style.gridColumn = '1 / -1';
    card.innerHTML = `
      <h3>HOME 재생 사운드</h3>
      <p class="muted">HOME 화면의 재생 버튼을 눌렀을 때만 재생됩니다. 자동재생되지 않습니다.</p>
      <label>사운드 파일<input id="homeSoundFile" type="file" accept="audio/*"></label>
      <div id="homeSoundPreview" class="file-preview"></div>
      <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
        <button id="deleteHomeSound" class="ghost-button" type="button">사운드 삭제</button>
      </div>`;
    grid.appendChild(card);

    $('#homeSoundFile')?.addEventListener('change', handleUpload);
    $('#deleteHomeSound')?.addEventListener('click', handleDelete);
    renderPreview();
  }

  function renderPreview() {
    const target = $('#homeSoundPreview');
    const del = $('#deleteHomeSound');
    if (!target) return;
    target.innerHTML = '';

    if (!currentPath) {
      target.textContent = '등록된 HOME 사운드가 없습니다.';
      if (del) del.disabled = true;
      return;
    }

    const audio = document.createElement('audio');
    audio.controls = true;
    audio.preload = 'metadata';
    audio.src = publicUrl(currentPath);
    audio.style.width = '100%';
    target.appendChild(audio);
    if (del) del.disabled = false;
  }

  async function readLatestSettings() {
    const { data, error } = await window.db
      .from('site_content')
      .select('settings_json')
      .eq('id', cfg.siteId || 1)
      .single();
    if (error) throw error;
    return data?.settings_json || {};
  }

  async function patchSettings(patch) {
    const latest = await readLatestSettings();
    window.nostalgiaAuthorizeAdminWrite?.(120000);
    const { error } = await window.db
      .from('site_content')
      .update({
        settings_json: { ...latest, ...patch },
        updated_at: new Date().toISOString()
      })
      .eq('id', cfg.siteId || 1);
    if (error) throw error;
  }

  async function handleUpload(event) {
    if (busy) return;
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file || !window.db) return;

    busy = true;
    setStatus('HOME 사운드 업로드 중…');
    const previousPath = currentPath;

    try {
      const path = `audio/home/${Date.now()}-${safeName(file.name)}`;
      const bucket = cfg.storageBucket || 'site-media';
      const { error: uploadError } = await window.db.storage
        .from(bucket)
        .upload(path, file, { upsert: false, contentType: file.type || undefined });
      if (uploadError) throw uploadError;

      await patchSettings({ home_sound_url: path });
      currentPath = path;
      renderPreview();

      if (previousPath && previousPath !== path) {
        window.db.storage.from(bucket).remove([previousPath]).catch(() => {});
      }

      setStatus('저장됨');
      toast('HOME 재생 사운드를 등록했습니다.', 'success');
    } catch (error) {
      console.error(error);
      setStatus('저장 실패');
      toast(error?.message || 'HOME 사운드 업로드에 실패했습니다.', 'error');
    } finally {
      busy = false;
      input.value = '';
    }
  }

  async function handleDelete(event) {
    if (busy || !currentPath || !event.isTrusted) return;
    busy = true;
    setStatus('HOME 사운드 삭제 중…');
    const oldPath = currentPath;

    try {
      await patchSettings({ home_sound_url: '' });
      currentPath = '';
      renderPreview();
      const bucket = cfg.storageBucket || 'site-media';
      window.db.storage.from(bucket).remove([oldPath]).catch(() => {});
      setStatus('저장됨');
      toast('HOME 재생 사운드를 삭제했습니다.', 'success');
    } catch (error) {
      console.error(error);
      setStatus('삭제 실패');
      toast(error?.message || 'HOME 사운드 삭제에 실패했습니다.', 'error');
    } finally {
      busy = false;
    }
  }

  async function load() {
    if (!window.db || !window.SUPABASE_CONFIGURED) return;
    try {
      const settings = await readLatestSettings();
      currentPath = String(settings.home_sound_url || '');
    } catch (error) {
      console.warn('HOME 사운드 설정을 불러오지 못했습니다.', error);
    }
    ensureCard();
    renderPreview();
  }

  function init() {
    const app = $('#adminApp');
    if (!app) return;

    if (!app.classList.contains('hidden')) load();
    const observer = new MutationObserver(() => {
      if (!app.classList.contains('hidden')) setTimeout(load, 80);
    });
    observer.observe(app, { attributes: true, attributeFilter: ['class'] });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
