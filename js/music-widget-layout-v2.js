(function () {
  'use strict';

  function arrange() {
    const widget = document.getElementById('musicWidget');
    const body = widget?.querySelector('.widget-body');
    const cover = document.getElementById('musicCover');
    const meta = widget?.querySelector('.music-meta');
    const controls = widget?.querySelector('.playlist-controls');
    const progressRow = widget?.querySelector('.playlist-progress-row');
    const progress = document.getElementById('widgetProgress');
    const time = document.getElementById('widgetTime');
    const volume = document.getElementById('widgetVolume');
    if (!widget || !body || !cover || !meta || !controls || !progressRow || !progress || !time || !volume) return false;

    const titlebarText = widget.querySelector('.widget-titlebar span');
    if (titlebarText) titlebarText.textContent = 'Nostalgia.exe';

    let top = widget.querySelector('.music-top-v2');
    if (!top) {
      top = document.createElement('div');
      top.className = 'music-top-v2';
      body.insertBefore(top, body.firstChild);
    }
    if (cover.parentElement !== top) top.appendChild(cover);
    if (meta.parentElement !== top) top.appendChild(meta);

    if (progress.parentElement !== progressRow) progressRow.prepend(progress);
    if (time.parentElement !== progressRow) progressRow.appendChild(time);

    let volumeWrap = controls.querySelector('.music-volume-v2');
    if (!volumeWrap) {
      volumeWrap = document.createElement('div');
      volumeWrap.className = 'music-volume-v2';
      controls.appendChild(volumeWrap);
    }
    if (volume.parentElement !== volumeWrap) volumeWrap.appendChild(volume);

    [...body.querySelectorAll('.player-row.compact')].forEach(row => {
      if (row.contains(document.getElementById('bgmToggle'))) row.classList.add('legacy-bgm-row');
      else row.classList.add('music-old-compact-row');
    });

    /* Match the requested visual order regardless of original DOM order. */
    top.after(progressRow);
    progressRow.after(controls);

    return true;
  }

  let tries = 0;
  const timer = setInterval(() => {
    tries += 1;
    if (arrange() || tries > 50) clearInterval(timer);
  }, 100);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(arrange, 220), { once: true });
  } else {
    setTimeout(arrange, 220);
  }
})();
