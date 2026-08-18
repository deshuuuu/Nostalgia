(function () {
  'use strict';

  function makeLayer(className, count) {
    const layer = document.createElement('div');
    layer.className = `night-star-layer ${className}`;
    layer.setAttribute('aria-hidden', 'true');

    for (let i = 0; i < count; i += 1) {
      const star = document.createElement('span');
      const bright = i % 4 === 0;
      star.className = `night-star ${bright ? 'spark' : 'dot'}`;

      const x = 2 + Math.random() * 96;
      const y = 2 + Math.random() * 94;
      const size = bright ? 7 + Math.random() * 7 : 1.5 + Math.random() * 2.5;
      const duration = bright ? 2.2 + Math.random() * 3.4 : 3.8 + Math.random() * 5.6;
      const delay = -Math.random() * duration;
      const maxOpacity = bright ? 0.55 + Math.random() * 0.35 : 0.28 + Math.random() * 0.34;

      star.style.setProperty('--star-x', `${x}%`);
      star.style.setProperty('--star-y', `${y}%`);
      star.style.setProperty('--star-size', `${size}px`);
      star.style.setProperty('--star-duration', `${duration}s`);
      star.style.setProperty('--star-delay', `${delay}s`);
      star.style.setProperty('--star-opacity', maxOpacity.toFixed(2));
      layer.appendChild(star);
    }

    return layer;
  }

  function boot() {
    if (!document.querySelector('.night-star-layer.main-stars')) {
      document.body.appendChild(makeLayer('main-stars', 34));
    }

    const entry = document.getElementById('entryOverlay');
    if (entry && !entry.querySelector('.night-star-layer.entry-stars')) {
      entry.appendChild(makeLayer('entry-stars', 26));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
