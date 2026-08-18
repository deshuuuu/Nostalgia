(function () {
  'use strict';

  const cfg = window.APP_CONFIG || {};
  let initialized = false;
  let saveTimer = null;
  let current = {
    enabled: true,
    start: '#55564f',
    end: '#3f413c',
    angle: 180
  };

  function normalizeHex(value, fallback) {
    const v = String(value || '').trim();
    return /^#[0-9a-f]{6}$/i.test(v) ? v : fallback;
  }

  async function fetchSettings() {
    const { data, error } = await window.db
      .from('site_content')
      .select('settings_json')
      .eq('id', cfg.siteId || 1)
      .single();
    if (error) throw error;
    return data?.settings_json || {};
  }

  async function persist() {
    const settings = await fetchSettings();
    const merged = {
      ...settings,
      background_gradient_enabled: current.enabled,
      background_gradient_start: current.start,
      background_gradient_end: current.end,
      background_gradient_angle: current.angle
    };
    const { error } = await window.db
      .from('site_content')
      .update({ settings_json: merged, updated_at: new Date().toISOString() })
      .eq('id', cfg.siteId || 1);
    if (error) throw error;
    const status = document.getElementById('saveStatus');
    if (status) status.textContent = '저장됨';
  }

  function scheduleSave(delay = 180) {
    clearTimeout(saveTimer);
    const status = document.getElementById('saveStatus');
    if (status) status.textContent = '배경 저장 중…';
    saveTimer = setTimeout(() => persist().catch(handleError), delay);
  }

  function handleError(error) {
    console.error(error);
    const status = document.getElementById('saveStatus');
    if (status) status.textContent = '오류';
    const toast = document.getElementById('toast');
    if (toast) {
      toast.textContent = error?.message || '배경 설정 저장 중 오류가 발생했습니다.';
      toast.className = 'toast show error';
      setTimeout(() => { toast.className = 'toast'; }, 2400);
    }
  }

  function updatePreview() {
    const preview = document.getElementById('backgroundGradientPreview');
    const angleLabel = document.getElementById('backgroundGradientAngleLabel');
    const angleInput = document.getElementById('backgroundGradientAngleInput');
    if (angleLabel) angleLabel.textContent = `${current.angle}°`;
    if (preview) {
      preview.style.background = current.enabled
        ? `linear-gradient(${current.angle}deg, ${current.start}, ${current.end})`
        : current.start;
      preview.style.opacity = current.enabled ? '1' : '.72';
    }
    if (angleInput) angleInput.disabled = !current.enabled;
  }

  function injectControls(settings) {
    const panel = document.querySelector('[data-tab-panel="site"] .admin-card');
    const bgInput = document.getElementById('backgroundColorInput');
    if (!panel || !bgInput || document.getElementById('backgroundGradientControls')) return;

    current.enabled = settings.background_gradient_enabled !== false;
    current.start = normalizeHex(settings.background_gradient_start, normalizeHex(settings.background_color, '#55564f'));
    current.end = normalizeHex(settings.background_gradient_end, '#3f413c');
    const angle = Number(settings.background_gradient_angle ?? 180);
    current.angle = Number.isFinite(angle) ? Math.max(0, Math.min(360, angle)) : 180;

    const box = document.createElement('div');
    box.id = 'backgroundGradientControls';
    box.style.cssText = 'margin-top:16px;padding:14px;border:1px solid rgba(226,220,190,.18);background:rgba(255,255,255,.02)';
    box.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px">
        <strong style="font-family:Georgia,serif;color:#e9e2c6;font-size:13px">배경 그라데이션</strong>
        <label class="check-row" style="margin:0"><input id="backgroundGradientEnabledInput" type="checkbox"> 사용</label>
      </div>
      <div id="backgroundGradientPreview" style="height:58px;border:1px solid rgba(226,220,190,.24);margin-bottom:12px"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <label>시작색<input id="backgroundGradientStartInput" type="color"></label>
        <label>끝색<input id="backgroundGradientEndInput" type="color"></label>
      </div>
      <label>방향 <span id="backgroundGradientAngleLabel"></span>
        <input id="backgroundGradientAngleInput" type="range" min="0" max="360" step="1">
      </label>
      <p class="muted" style="margin-bottom:0">그라데이션을 끄면 배경은 기본 배경색 한 가지로 표시되고, 은은한 질감 레이어만 남습니다.</p>`;

    const anchor = bgInput.closest('label');
    anchor?.after(box);

    const enabled = document.getElementById('backgroundGradientEnabledInput');
    const start = document.getElementById('backgroundGradientStartInput');
    const end = document.getElementById('backgroundGradientEndInput');
    const angleInput = document.getElementById('backgroundGradientAngleInput');

    enabled.checked = current.enabled;
    start.value = current.start;
    end.value = current.end;
    angleInput.value = current.angle;
    updatePreview();

    enabled.addEventListener('change', () => {
      current.enabled = enabled.checked;
      updatePreview();
      scheduleSave();
    });
    start.addEventListener('input', () => {
      current.start = start.value;
      updatePreview();
      scheduleSave();
    });
    end.addEventListener('input', () => {
      current.end = end.value;
      updatePreview();
      scheduleSave();
    });
    angleInput.addEventListener('input', () => {
      current.angle = Number(angleInput.value) || 0;
      updatePreview();
      scheduleSave();
    });

    bgInput.addEventListener('input', () => {
      if (!current.enabled) {
        current.start = normalizeHex(bgInput.value, current.start);
        start.value = current.start;
        updatePreview();
      }
    });
  }

  async function init() {
    if (initialized || !window.db || !window.SUPABASE_CONFIGURED) return;
    const app = document.getElementById('adminApp');
    if (!app || app.classList.contains('hidden')) return;
    initialized = true;
    try {
      const settings = await fetchSettings();
      injectControls(settings);
    } catch (error) {
      handleError(error);
    }
  }

  const timer = setInterval(() => {
    if (initialized) { clearInterval(timer); return; }
    init();
  }, 250);
  setTimeout(() => clearInterval(timer), 30000);
})();
