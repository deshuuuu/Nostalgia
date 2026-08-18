(function () {
  'use strict';

  function makeDeleteSentinel() {
    const editor = document.getElementById('storyEditor');
    if (!editor || editor.querySelector('.story-row')) return;

    const row = document.createElement('div');
    row.className = 'story-row story-delete-sentinel';
    row.hidden = true;
    row.setAttribute('aria-hidden', 'true');
    row.innerHTML = `
      <input class="story-title" type="hidden" value="">
      <textarea class="story-body" hidden></textarea>
      <input class="story-locked" type="checkbox" hidden>
    `;
    editor.appendChild(row);
  }

  function removeSentinel() {
    document.querySelector('.story-delete-sentinel')?.remove();
  }

  document.addEventListener('click', event => {
    if (!event.isTrusted) return;

    const removeButton = event.target.closest('.story-row .remove-button');
    if (removeButton) {
      setTimeout(() => {
        const editor = document.getElementById('storyEditor');
        if (!editor) return;
        if (!editor.querySelector('.story-row')) makeDeleteSentinel();
      }, 0);
      return;
    }

    if (event.target.closest('#addStoryChapter')) {
      removeSentinel();
    }
  }, true);

  const editor = document.getElementById('storyEditor');
  if (editor) {
    const observer = new MutationObserver(() => {
      const realRows = [...editor.querySelectorAll('.story-row:not(.story-delete-sentinel)')];
      if (realRows.length) removeSentinel();
    });
    observer.observe(editor, { childList: true });
  }
})();
