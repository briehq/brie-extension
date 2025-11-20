import { tabs, contextMenus, runtime, webRequest, webNavigation } from 'webextension-polyfill';

import {
  handleOnBeforeRequest,
  handleOnBeforeSendHeaders,
  handleOnCompleted,
  handleOnContextMenuClicked,
  handleOnInstalled,
  handleOnMessage,
  handleOnTabRemoved,
  handleOnTabUpdated,
  handleOnCommitted,
} from '@src/services';

tabs.onRemoved.addListener(handleOnTabRemoved);
tabs.onUpdated.addListener(handleOnTabUpdated);
runtime.onMessage.addListener(handleOnMessage);
runtime.onInstalled.addListener(handleOnInstalled);
contextMenus.onClicked.addListener(handleOnContextMenuClicked);

/**
 * @todo
 * there is an scenario when tabId is -1,
 * but we know the requestId and we can use it to populate the right request data
 *
 * related to all 3 web req states
 */
webRequest.onBeforeRequest.addListener(handleOnBeforeRequest, { urls: ['<all_urls>'] }, ['requestBody']);
webRequest.onBeforeSendHeaders.addListener(handleOnBeforeSendHeaders, { urls: ['<all_urls>'] }, ['requestHeaders']);
webRequest.onCompleted.addListener(handleOnCompleted, { urls: ['<all_urls>'] });
webNavigation.onCommitted.addListener(handleOnCommitted);
