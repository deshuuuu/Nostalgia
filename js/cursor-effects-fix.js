(function () {
  'use strict';

  if (matchMedia('(pointer: coarse)').matches) return;

  const cursor = document.getElementById('customCursor');
  if (!cursor) return;

  function ensureFxLayer() {
    let layer = document.getElementById('nostalgiaCursorFxLayer');
    if (layer) return layer;
    layer = document.createElement('div');
    layer.id = 'nostalgiaCursorFxLayer';
    layer.setAttribute('aria-hidden', 'true');
    layer.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;overflow:hidden;z-index:2147483000;display:block;visibility:visible;opacity:1';
    document.body.appendChild(layer);
    return layer;
  }

  function installStyle() {
    if (document.getElementById('cursorEffectsFixStyle')) return;
    const style = document.createElement('style');
    style.id = 'cursorEffectsFixStyle';
    style.textContent = `
      .custom-cursor,
      .custom-cursor.pressed {
        --cursor-pressed-scale: 1 !important;
      }
      #nostalgiaCursorFxLayer {
        display:block !important;
        visibility:visible !important;
        opacity:1 !important;
        z-index:2147483000 !important;
      }
      #nostalgiaCursorFxLayer .click-particle {
        position:fixed !important;
        pointer-events:none !important;
      }
      #customCursor { z-index:2147483001 !important; }
    `;
    document.head.appendChild(style);
  }

  function resetCursorState() {
    cursor.classList.remove('pressed');
    cursor.style.setProperty('--cursor-pressed-scale', '1');
  }

  function createParticles(x, y) {
    const layer = ensureFxLayer();
    for (let i = 0; i < 7; i++) {
      const p = document.createElement('span');
      p.className = 'click-particle cursor-particle-runtime';
      const angle = (Math.PI * 2 * i / 7) + Math.random() * .28;
      const distance = 20 + Math.random() * 34;
      p.style.left = `${x}px`;
      p.style.top = `${y}px`;
      p.style.setProperty('--px', `${Math.cos(angle) * distance}px`);
      p.style.setProperty('--py', `${Math.sin(angle) * distance}px`);
      p.style.setProperty('--pr', `${Math.round(Math.random() * 180 - 90)}deg`);
      p.style.fontSize = `${8 + Math.random() * 8}px`;
      layer.appendChild(p);
      p.addEventListener('animationend', () => p.remove(), { once: true });
      setTimeout(() => p.remove(), 900);
    }
  }

  function reactivate() {
    const layer = ensureFxLayer();
    layer.style.setProperty('display', 'block', 'important');
    layer.style.setProperty('visibility', 'visible', 'important');
    layer.style.setProperty('opacity', '1', 'important');
    resetCursorState();
  }

  installStyle();
  ensureFxLayer();
  resetCursorState();

  document.addEventListener('pointerdown', event => {
    resetCursorState();
    createParticles(event.clientX, event.clientY);
    setTimeout(resetCursorState, 0);
  }, { passive: true, capture: true });

  ['pointerup', 'pointercancel', 'lostpointercapture', 'mouseleave'].forEach(type => {
    document.addEventListener(type, resetCursorState, { passive: true });
  });

  const enter = document.getElementById('enterButton');
  enter?.addEventListener('click', () => {
    reactivate();
    requestAnimationFrame(reactivate);
    setTimeout(reactivate, 100);
    setTimeout(reactivate, 700);
  }, true);

  window.addEventListener('blur', resetCursorState);
  window.addEventListener('pageshow', reactivate);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) reactivate();
  });
})();