export const injectExtendScript = (): void => {
  if (document.documentElement.hasAttribute('data-brie-extend')) return;
  document.documentElement.setAttribute('data-brie-extend', '1');

  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('content/extend.iife.js');
  script.type = 'text/javascript';
  script.async = false;
  script.onload = () => script.remove();
  script.onerror = () => {
    console.warn("[Brie] Couldn't load one of the required files needed to run properly.");
    script.remove();
  };

  (document.head ?? document.documentElement).appendChild(script);
};
