(function () {
  'use strict';

  const cfg = window.APP_CONFIG || {};

  async function applySplitImages() {
    if (!window.SUPABASE_CONFIGURED || !window.db) return;
    try {
      const { data, error } = await window.db
        .from('site_content')
        .select('settings_json')
        .eq('id', cfg.siteId || 1)
        .single();
      if (error) throw error;

      const settings = data?.settings_json || {};
      const homePath = settings.home_image_url || '';
      const profilePath = settings.profile_image_url || '';

      const homeImage = document.getElementById('characterImage');
      const profileImage = document.getElementById('profileImage');

      if (homeImage && homePath) {
        homeImage.src = window.publicUrlForPath(homePath) || homeImage.src;
      }
      if (profileImage && profilePath) {
        profileImage.src = window.publicUrlForPath(profilePath) || profileImage.src;
      }
    } catch (error) {
      console.warn('HOME/PROFILE 분리 이미지를 불러오지 못했습니다.', error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(applySplitImages, 0), { once: true });
  } else {
    setTimeout(applySplitImages, 0);
  }

  window.applySplitCharacterImages = applySplitImages;
})();
