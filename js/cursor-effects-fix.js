(function () {
  'use strict';

  if (matchMedia('(pointer: coarse)').matches) return;

  const cursor = document.getElementById('customCursor');
  const particleLayer = document.getElementById('particleLayer');
  if (!cursor || !particleLayer) return;

  function installStyle() {
    if (document.getElementById('cursorEffectsFixStyle')) return;
    const style = document.createElement('style');
    style.id = 'cursorEffectsFixStyle';
    style.textContent = `
      .custom-cursor,
      .custom-cursor.pressed {
        --cursor-pressed-scale: 1 !important;
      }
      .particle-layer {
        display: block !important;
        z-index: 19991 !important;
        pointer-events: none !important;
      }
      .click-particle.cursor-particle-restored {
        position: fixed !important;
        z-index: 19992 !important;
        pointer-events: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  function resetCursorState() {
    cursor.classList.remove('pressed');
    cursor.style.setProperty('--cursor-pressed-scale', '1');
  }

  function createFallbackParticles(x, y) {
    for (let i = 0; i < 7; i++) {
      const p = document.createElement('span');
      p.className = 'click-particle cursor-particle-restored';
      const angle = (Math.PI * 2 * i / 7) + Math.random() * .28;
      const distance = 20 + Math.random() * 34;
      p.style.left = `${x}px`;
      p.style.top = `${y}px`;
      p.style.setProperty('--px', `${Math.cos(angle) * distance}px`);
      p.style.setProperty('--py', `${Math.sin(angle) * distance}px`);
      p.style.setProperty('--pr', `${Math.round(Math.random() * 180 - 90)}deg`);
      p.style.fontSize = `${8 + Math.random() * 8}px`;
      particleLayer.appendChild(p);
      p.addEventListener('animationend', () => p.remove(), { once: true });
      setTimeout(() => p.remove(), 900);
    }
  }

  installStyle();
  resetCursorState();

  document.addEventListener('pointerdown', event => {
    const before = particleLayer.querySelectorAll('.click-particle').length;

    // The cursor must never remain shrunken after a click.
    cursor.classList.remove('pressed');
    cursor.style.setProperty('--cursor-pressed-scale', '1');

    setTimeout(() => {
      resetCursorState();

      // site.js gets first chance to create the configured particles.
      // If it did not create any, restore the sparkle burst here.
      const after = particleLayer.querySelectorAll('.click-particle').length;
      if (after <= before) createFallbackParticles(event.clientX, event.clientY);
    }, 0);
  }, { passive: true });

  ['pointerup', 'pointercancel', 'lostpointercapture', 'mouseleave'].forEach(type => {
    document.addEventListener(type, resetCursorState, { passive: true });
  });

  window.addEventListener('blur', resetCursorState);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) resetCursorState();
  });
})();