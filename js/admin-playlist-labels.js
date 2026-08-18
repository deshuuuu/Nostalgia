(function () {
  'use strict';

  function relabel() {
    const manager = document.getElementById('playlistManager');
    if (!manager) return false;
    manager.querySelectorAll('.pl-track').forEach(row => {
      const titleInput = row.querySelector('.pl-title');
      const artistInput = row.querySelector('.pl-artist');
      if (titleInput?.parentElement) {
        const label = titleInput.parentElement;
        if (label.firstChild?.nodeType === Node.TEXT_NODE) label.firstChild.textContent = '곡 제목 (위젯 표시)';
        titleInput.placeholder = '예: Nostalgia';
      }
      if (artistInput?.parentElement) {
        const label = artistInput.parentElement;
        if (label.firstChild?.nodeType === Node.TEXT_NODE) label.firstChild.textContent = '가수 · 아티스트 (위젯 표시)';
        artistInput.placeholder = '예: Character Theme';
      }
    });
    return true;
  }

  const timer = setInterval(() => {
    if (relabel()) {
      const manager = document.getElementById('playlistManager');
      const observer = new MutationObserver(() => relabel());
      observer.observe(manager, { childList: true, subtree: true });
      clearInterval(timer);
    }
  }, 250);
  setTimeout(() => clearInterval(timer), 30000);
})();
