import type { WebRequest } from 'webextension-polyfill';
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
  initBadgeListener,
  syncMicPermission,
} from '@src/services';

tabs.onRemoved.addListener(handleOnTabRemoved);
tabs.onUpdated.addListener(handleOnTabUpdated);
runtime.onMessage.addListener(handleOnMessage);
runtime.onInstalled.addListener(handleOnInstalled);
contextMenus.onClicked.addListener(handleOnContextMenuClicked);

const TRACKED_REQUEST_TYPES: WebRequest.ResourceType[] = [
  'main_frame',
  'sub_frame',
  'script',
  'stylesheet',
  'xmlhttprequest',
  'websocket',
];

webRequest.onBeforeRequest.addListener(handleOnBeforeRequest, { urls: ['<all_urls>'], types: TRACKED_REQUEST_TYPES }, [
  'requestBody',
]);
webRequest.onBeforeSendHeaders.addListener(
  handleOnBeforeSendHeaders,
  { urls: ['<all_urls>'], types: TRACKED_REQUEST_TYPES },
  ['requestHeaders'],
);
webRequest.onCompleted.addListener(handleOnCompleted, {
  urls: ['<all_urls>'],
  types: TRACKED_REQUEST_TYPES,
});
webNavigation.onCommitted.addListener(handleOnCommitted);

initBadgeListener();
syncMicPermission();
