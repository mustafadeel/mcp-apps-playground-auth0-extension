import { useEffect } from 'react';

function syncUdsColorMode() {
  document.documentElement.classList.toggle(
    'dark',
    document.documentElement.dataset.theme === 'dark',
  );
}

function UdsThemeBridge() {
  useEffect(() => {
    syncUdsColorMode();

    const observer = new MutationObserver(syncUdsColorMode);
    observer.observe(document.documentElement, {
      attributeFilter: ['data-theme'],
      attributes: true,
    });

    return () => observer.disconnect();
  }, []);

  return null;
}

export { UdsThemeBridge };
