(function () {
  'use strict';

  const cfg = window.APP_CONFIG || {};
  let audio = null;
  let button = null;

  function publicUrl(path) {
    if (!path) return '';
    return window.publicUrlForPath ? window.publicUrlForPath(path) : path;
  }

  function installStyle() {
    if (document.getElementById('homeSoundButtonStyle')) return;
    const style = document.createElement('style');
    style.id = 'homeSoundButtonStyle';
    style.textContent = `
      .home-sound-control {
        display: flex;
        align-items: center;
        gap: 12px;
        margin: 0 0 16px;
      }
      .home-sound-button {
        position: relative;
        min-height: 38px;
        padding: 0 16px;
        border: 1px solid color-mix(in srgb, var(--accent, #d9d0a4) 46%, transparent);
        border-radius: 2px;
        background: linear-gradient(180deg, rgba(255,255,255,.035), rgba(20,20,18,.08));
        color: var(--accent-soft, #ebe4c2);
        font-family: Georgia, "Times New Roman", serif;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: .15em;
        box-shadow: inset 0 0 0 1px rgba(255,255,255,.025);
      }
      .home-sound-button::before {
        content: "◆";
        margin-right: 9px;
        color: var(--accent, #d9d0a4);
        font-size: 7px;
      }
      .home-sound-button:hover {
        border-color: var(--accent, #d9d0a4);
        background: color-mix(in srgb, var(--accent, #d9d0a4) 8%, transparent);
      }
      .home-sound-button.is-playing {
        border-color: var(--accent, #d9d0a4);
        background: color-mix(in srgb, var(--accent, #d9d0a4) 10%, transparent);
      }
    `;
    document.head.appendChild(style);
  }

  function resetButton() {
    if (!button) return;
    button.classList.remove('is-playing');
    button.textContent = '▶ PLAY SOUND';
    button.setAttribute('aria-label', 'HOME 사운드 재생');
  }

  function stop() {
    if (!audio) return;
    audio.pause();
    try { audio.currentTime = 0; } catch (_) {}
    resetButton();
  }

  function makeControl(path) {
    const hero = document.querySelector('.hero-copy');
    const profileButton = hero?.querySelector('.primary-button.nav-button[data-page="profile"]');
    if (!hero || !profileButton || document.getElementById('homeSoundControl')) return;

    installStyle();

    const wrap = document.createElement('div');
    wrap.id = 'homeSoundControl';
    wrap.className = 'home-sound-control';

    button = document.createElement('button');
    button.type = 'button';
    button.className = 'home-sound-button';
    button.textContent = '▶ PLAY SOUND';
    button.setAttribute('aria-label', 'HOME 사운드 재생');

    audio = document.createElement('audio');
    audio.preload = 'metadata';
    audio.src = publicUrl(path);

    button.addEventListener('click', async () => {
      if (!audio) return;
      if (!audio.paused) {
        stop();
        return;
      }
      try {
        audio.currentTime = 0;
        await audio.play();
        button.classList.add('is-playing');
        button.textContent = '■ STOP SOUND';
        button.setAttribute('aria-label', 'HOME 사운드 정지');
      } catch (error) {
        console.warn('HOME 사운드를 재생하지 못했습니다.', error);
        resetButton();
      }
    });

    audio.addEventListener('ended', resetButton);
    audio.addEventListener('pause', () => {
      if (audio.currentTime === 0 || audio.ended) resetButton();
    });

    wrap.append(button, audio);
    profileButton.before(wrap);

    const homePanel = document.querySelector('[data-page-panel="home"]');
    if (homePanel) {
      const observer = new MutationObserver(() => {
        if (!homePanel.classList.contains('active')) stop();
      });
      observer.observe(homePanel, { attributes: true, attributeFilter: ['class'] });
    }
  }

  async function boot() {
    if (!window.db || !window.SUPABASE_CONFIGURED) return;
    try {
      const { data, error } = await window.db
        .from('site_content')
        .select('settings_json')
        .eq('id', cfg.siteId || 1)
        .single();
      if (error) throw error;
      const path = String(data?.settings_json?.home_sound_url || '');
      if (path) makeControl(path);
    } catch (error) {
      console.warn('HOME 재생 사운드 설정을 불러오지 못했습니다.', error);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
