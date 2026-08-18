(function () {
  'use strict';

  function formatBody(body) {
    if (!body || body.dataset.storyInlineFormatted === '1') return;

    const text = body.textContent || '';
    const pattern = /\*\*([^*]+)\*\*|\*([^*\n]+)\*/g;
    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      if (match.index > lastIndex) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
      }

      if (match[1] !== undefined) {
        const strong = document.createElement('strong');
        strong.textContent = match[1];
        fragment.appendChild(strong);
      } else {
        const em = document.createElement('em');
        em.textContent = match[2] || '';
        fragment.appendChild(em);
      }

      lastIndex = pattern.lastIndex;
    }

    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
    }

    body.replaceChildren(fragment);
    body.dataset.storyInlineFormatted = '1';
  }

  function formatAll(root = document) {
    root.querySelectorAll?.('.story-body').forEach(formatBody);
    if (root.matches?.('.story-body')) formatBody(root);
  }

  function init() {
    const storyList = document.getElementById('storyList');
    if (!storyList) return;

    formatAll(storyList);

    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType !== Node.ELEMENT_NODE) return;
          formatAll(node);
        });
      });
    });

    observer.observe(storyList, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();