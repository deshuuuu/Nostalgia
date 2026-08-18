window.DEFAULT_KEYCAP_HTML = `
<style>
  .keycap-default {
    display:grid;
    grid-template-columns:repeat(2,1fr);
    gap:10px;
    font-family:Georgia,"Times New Roman",serif;
  }
  .keycap-default button {
    min-height:55px;
    border:1px solid rgba(225,219,190,.35);
    border-radius:3px;
    color:#e7e0c5;
    background:linear-gradient(180deg,rgba(230,223,193,.14),rgba(255,255,255,.025)),#4a4c47;
    box-shadow:inset 0 -5px 0 rgba(27,28,26,.28),inset 0 1px 0 rgba(255,255,255,.06),0 2px 0 rgba(25,26,24,.20);
    font-weight:700;
    font-size:16px;
    transition:transform .08s ease,box-shadow .08s ease,border-color .12s ease;
  }
  .keycap-default button:hover {
    border-color:rgba(230,223,193,.55);
  }
  .keycap-default button:active,.keycap-default button.pressed {
    transform:translateY(3px);
    box-shadow:inset 0 -2px 0 rgba(27,28,26,.28),inset 0 1px 0 rgba(255,255,255,.04);
  }
</style>
<div class="keycap-default">
  <button type="button" data-key="Z">Z</button>
  <button type="button" data-key="X">X</button>
  <button type="button" data-key="C">C</button>
  <button type="button" data-key="V">V</button>
</div>`;

window.DEFAULT_SITE_CONTENT = {
  id: 1,
  character_name: 'CHARACTER',
  tagline: 'A tiny place made for one character.',
  character_image_url: 'assets/placeholder-character.svg',
  profile_json: {
    bio: '관리자 페이지에서 캐릭터 소개를 입력할 수 있습니다.',
    fields: [
      { label: 'NAME', value: 'CHARACTER' },
      { label: 'AGE', value: '-' },
      { label: 'HEIGHT', value: '-' }
    ]
  },
  story_json: [
    { title: '01. THE BEGINNING', body: '관리자 페이지에서 스토리 챕터를 추가하고 수정할 수 있습니다.' }
  ],
  settings_json: {
    site_title: 'Character Home',
    enter_label: 'ENTER',
    entry_kicker: 'A MEMORY, KEPT QUIETLY.',
    entry_image_url: 'assets/placeholder-character.svg',
    entry_note: '브라우저 정책상 ENTER 이후 음악이 재생됩니다. (AI 제작 음악)',
    accent_color: '#d9d0a4',
    background_color: '#55564f',
    bgm_url: '',
    bgm_title: 'CHARACTER THEME',
    bgm_volume: 0.45,
    click_sound_url: '',
    click_volume: 0.55,
    widget_track_url: '',
    widget_cover_url: '',
    widget_track_title: 'THEME TRACK',
    widget_track_artist: 'UNKNOWN',
    widget_volume: 0.7,
    pause_bgm_on_widget_play: true,
    cursor_url: 'assets/default-cursor.svg',
    cursor_size: 34,
    cursor_pressed_scale: 0.82,
    trail_enabled: true,
    trail_style: 'sparkle',
    trail_spacing: 12,
    trail_size: 13,
    trail_fade_ms: 520,
    trail_image_url: '',
    click_particles: true,
    keycap_sounds: { Z: '', X: '', C: '', V: '' }
  },
  keycap_html: window.DEFAULT_KEYCAP_HTML
};
