(function () {
  'use strict';

  function closeNewStoryCards(root = document) {
    const cards = root.querySelectorAll?.('details.story-card:not([data-default-closed-ready])') || [];
    cards.forEach(card => {
      card.open = false;
      card.removeAttribute('open');
      card.dataset.defaultClosedReady = '1';
    });
  }

  function init() {
    const storyList = document.getElementById('storyList');
    if (!storyList) return;

    closeNewStoryCards(storyList);

    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (!(node instanceof Element)) return;
          if (node.matches?.('details.story-card')) {
            closeNewStoryCards(node.parentElement || storyList);
          } else if (node.querySelector?.('details.story-card')) {
            closeNewStoryCards(node);
          }
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