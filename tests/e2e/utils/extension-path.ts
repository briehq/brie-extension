export const getChromeExtensionPath = async (browser: WebdriverIO.Browser) => {
  await browser.url('chrome://extensions/');
  /**
   * The documented `$('extensions-item')` selector doesn't resolve because the shadow root
   * isn't auto-pierced — walk it manually instead.
   * https://github.com/webdriverio/webdriverio/issues/13521
   */
  const extensionItem = await (async () => {
    const extensionsManager = await $('extensions-manager').getElement();
    const itemList = await extensionsManager.shadow$('#container > #viewManager > extensions-item-list');
    return itemList.shadow$('extensions-item');
  })();

  const extensionId = await extensionItem.getAttribute('id');

  if (!extensionId) {
    throw new Error('Extension ID not found');
  }

  return `chrome-extension://${extensionId}`;
};

export const getFirefoxExtensionPath = async (browser: WebdriverIO.Browser) => {
  await browser.url('about:debugging#/runtime/this-firefox');
  const uuidElement = await browser.$('//dt[contains(text(), "Internal UUID")]/following-sibling::dd').getElement();
  const internalUUID = await uuidElement.getText();

  if (!internalUUID) {
    throw new Error('Internal UUID not found');
  }

  return `moz-extension://${internalUUID}`;
};
