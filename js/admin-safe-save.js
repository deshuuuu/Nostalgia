(function () {
  'use strict';

  const cfg = window.APP_CONFIG || {};
  const pendingMedia = {};
  const pendingKeycapSounds = {};
  let saving = false;
  let storageWrapped = false;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function status(text) {
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

  function num(selector, fallback) {
    const value = Number($(selector)?.value);
    return Number.isFinite(value) ? value : fallback;
  }

  function normalizeHex(value, fallback) {
    const v = String(value || '').trim();
    return /^#[0-9a-f]{6}$/i.test(v) ? v : fallback;
  }

  function valueOrLatest(selector, latestValue, fallback = '') {
    const input = $(selector);
    return input ? input.value : (latestValue ?? fallback);
  }

  function rememberUpload(path) {
    const p = String(path || '');
    if (!p) return;

    if (p.startsWith('character/home/')) pendingMedia.home_image_url = p;
    else if (p.startsWith('character/profile/')) pendingMedia.profile_image_url = p;
    else if (p.startsWith('entry/')) pendingMedia.entry_image_url = p;
    else if (p.startsWith('audio/bgm/')) pendingMedia.bgm_url = p;
    else if (p.startsWith('audio/click/')) pendingMedia.click_sound_url = p;
    else if (p.startsWith('audio/widget/')) pendingMedia.widget_track_url = p;
    else if (p.startsWith('music-cover/')) pendingMedia.widget_cover_url = p;
    else if (p.startsWith('cursor-trail/')) pendingMedia.trail_image_url = p;
    else if (p.startsWith('cursor/')) pendingMedia.cursor_url = p;

    const keyMatch = p.match(/^keycap\/([zxcv])\//i);
    if (keyMatch) pendingKeycapSounds[keyMatch[1].toUpperCase()] = p;
  }

  function wrapStorageUploads() {
    if (storageWrapped || !window.db?.storage?.from) return;
    storageWrapped = true;

    const originalFrom = window.db.storage.from.bind(window.db.storage);
    window.db.storage.from = function wrappedFrom(bucket) {
      const api = originalFrom(bucket);
      if (!api?.upload || bucket !== (cfg.storageBucket || 'site-media')) return api;

      const originalUpload = api.upload.bind(api);
      api.upload = async function wrappedUpload(path, file, options) {
        const result = await originalUpload(path, file, options);
        if (!result?.error) rememberUpload(path);
        return result;
      };
      return api;
    };
  }

  function collectSettingsPatch(latestSettings) {
    const patch = {
      bgm_title: $('#bgmTitleInput')?.value.trim() ?? latestSettings.bgm_title,
      bgm_volume: num('#bgmVolumeInput', latestSettings.bgm_volume ?? .45),
      click_volume: num('#clickVolumeInput', latestSettings.click_volume ?? .55),
      widget_track_title: $('#widgetTrackTitleInput')?.value.trim() ?? latestSettings.widget_track_title,
      widget_track_artist: $('#widgetTrackArtistInput')?.value.trim() ?? latestSettings.widget_track_artist,
      widget_volume: num('#widgetVolumeInput', latestSettings.widget_volume ?? .7),
      pause_bgm_on_widget_play: $('#pauseBgmCheck')?.checked ?? latestSettings.pause_bgm_on_widget_play,
      cursor_size: num('#cursorSizeInput', latestSettings.cursor_size ?? 34),
      cursor_pressed_scale: num('#cursorScaleInput', latestSettings.cursor_pressed_scale ?? .82),
      trail_enabled: $('#trailEnabledCheck')?.checked ?? latestSettings.trail_enabled,
      trail_style: $('#trailStyleInput')?.value ?? latestSettings.trail_style,
      trail_spacing: num('#trailSpacingInput', latestSettings.trail_spacing ?? 12),
      trail_size: num('#trailSizeInput', latestSettings.trail_size ?? 13),
      trail_fade_ms: num('#trailFadeInput', latestSettings.trail_fade_ms ?? 520),
      click_particles: $('#clickParticlesCheck')?.checked ?? latestSettings.click_particles,
      site_title: $('#siteTitleInput')?.value.trim() || latestSettings.site_title || 'Character Home',
      enter_label: $('#enterLabelInput')?.value.trim() || latestSettings.enter_label || 'ENTER',
      entry_kicker: $('#entryKickerInput')?.value.trim() || latestSettings.entry_kicker || 'A MEMORY, KEPT QUIETLY.',
      entry_note: $('#entryNoteInput')?.value.trim() || latestSettings.entry_note || '브라우저 정책상 ENTER 이후 음악이 재생됩니다. (AI 제작 음악)',
      accent_color: normalizeHex($('#accentColorInput')?.value, latestSettings.accent_color || '#d9d0a4'),
      background_color: normalizeHex($('#backgroundColorInput')?.value, latestSettings.background_color || '#55564f'),
      home_eyebrow: valueOrLatest('#homeEyebrowInput', latestSettings.home_eyebrow, 'WELCOME TO THE ARCHIVE'),
      footer_archive_text: valueOrLatest('#footerArchiveInput', latestSettings.footer_archive_text, ''),
      story_password: valueOrLatest('#storyPasswordInput', latestSettings.story_password, '')
    };

    Object.assign(patch, pendingMedia);
    if (Object.keys(pendingKeycapSounds).length) {
      patch.keycap_sounds = {
        ...(latestSettings.keycap_sounds || {}),
        ...pendingKeycapSounds
      };
    }
    return patch;
  }

  function collectProfile(existingProfile) {
    const bioInput = $('#profileBioInput');
    const rows = $$('.profile-field-row');
    if (!bioInput || !rows.length) return existingProfile || { bio: '', fields: [] };
    return {
      bio: bioInput.value,
      fields: rows.map(row => ({
        label: $('.field-label', row)?.value.trim() || '',
        value: $('.field-value', row)?.value || ''
      })).filter(item => item.label || item.value)
    };
  }

  function collectStory(existingStory) {
    const rows = $$('.story-row');
    if (!rows.length) return Array.isArray(existingStory) ? existingStory : [];
    const old = Array.isArray(existingStory) ? existingStory : [];
    return rows.map((row, index) => {
      const lockInput = $('.story-locked', row);
      return {
        title: $('.story-title', row)?.value.trim() || '',
        body: $('.story-body', row)?.value || '',
        locked: lockInput ? lockInput.checked : Boolean(old[index]?.locked)
      };
    }).filter(item => item.title || item.body);
  }

  async function safeSave() {
    if (saving || !window.db) return;
    saving = true;
    const button = $('#saveAllButton');
    if (button) button.disabled = true;
    status('안전 저장 중…');

    try {
      window.nostalgiaAuthorizeAdminWrite?.(120000);
      const { data: latest, error: readError } = await window.db
        .from('site_content')
        .select('*')
        .eq('id', cfg.siteId || 1)
        .single();
      if (readError) throw readError;

      const latestSettings = { ...(latest?.settings_json || {}) };
      const mergedSettings = {
        ...latestSettings,
        ...collectSettingsPatch(latestSettings)
      };

      const payload = {
        character_name: $('#characterNameInput')?.value.trim() || latest?.character_name || 'CHARACTER',
        tagline: $('#taglineInput')?.value ?? latest?.tagline ?? '',
        character_image_url: latest?.character_image_url || '',
        profile_json: collectProfile(latest?.profile_json),
        story_json: collectStory(latest?.story_json),
        settings_json: mergedSettings,
        keycap_html: $('#keycapHtmlInput')?.value || latest?.keycap_html || window.DEFAULT_KEYCAP_HTML,
        updated_at: new Date().toISOString()
      };

      const { error } = await window.db
        .from('site_content')
        .update(payload)
        .eq('id', cfg.siteId || 1);
      if (error) throw error;

      Object.keys(pendingMedia).forEach(key => delete pendingMedia[key]);
      Object.keys(pendingKeycapSounds).forEach(key => delete pendingKeycapSounds[key]);
      status('저장됨');
      toast('기존 설정을 보존해서 저장했습니다.', 'success');
    } catch (error) {
      console.error(error);
      status('저장 실패');
      toast(error?.message || '저장 중 오류가 발생했습니다.', 'error');
    } finally {
      saving = false;
      if (button) button.disabled = false;
    }
  }

  function guardSaveClicks() {
    document.addEventListener('click', event => {
      const button = event.target?.closest?.('#saveAllButton');
      if (!button) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      if (!event.isTrusted) {
        status('저장 필요');
        return;
      }

      safeSave();
    }, true);
  }

  function init() {
    wrapStorageUploads();
    guardSaveClicks();
  }

  init();
  window.safeSaveNostalgiaAdmin = safeSave;
})();