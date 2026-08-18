(function () {
  'use strict';

  const PLACEHOLDER = 'assets/placeholder-character.svg';

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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(refreshEntry, 80), { once: true });
  } else {
    setTimeout(refreshEntry, 80);
  }
})();
