import 'webextension-polyfill';

import { t } from '@extension/i18n';
import {
  annotationsRedoStorage,
  annotationsStorage,
  captureStateStorage,
  captureTabStorage,
  pendingReloadTabsStorage,
} from '@extension/storage';

import { addOrMergeRecords, getRecords } from '@src/utils';
import { deleteRecords } from '@src/utils/manage-records.util';

chrome.tabs.onRemoved.addListener(async tabId => {
  // Remove closed tab from pending reload tabs
  const pendingTabIds = await pendingReloadTabsStorage.getAll();
  if (pendingTabIds.includes(tabId)) {
    await pendingReloadTabsStorage.remove(tabId);
  }

  // Always clean up records for any closed tab
  deleteRecords(tabId);

  // Additional cleanup for capture tabs only
  const captureTabId = await captureTabStorage.getCaptureTabId();
  if (tabId === captureTabId) {
    await captureStateStorage.setCaptureState('idle');
    await captureTabStorage.setCaptureTabId(null);

    annotationsStorage.clearAll();
    annotationsRedoStorage.clearAll();
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  // If tab finished loading (refreshed), remove it from pending reload tabs
  if (changeInfo.status === 'complete') {
    const pendingTabIds = await pendingReloadTabsStorage.getAll();
    if (pendingTabIds.includes(tabId)) {
      await pendingReloadTabsStorage.remove(tabId);
    }
  }

  if (changeInfo.status !== 'loading') return;

  const [state, capturedTabId] = await Promise.all([
    captureStateStorage.getCaptureState(),
    captureTabStorage.getCaptureTabId(),
  ]);

  if (!capturedTabId && state === 'unsaved') {
    await captureStateStorage.setCaptureState('idle');
  }

  if (tabId === capturedTabId) {
    await captureStateStorage.setCaptureState('idle');
    await captureTabStorage.setCaptureTabId(null);

    annotationsStorage.clearAll();
    annotationsRedoStorage.clearAll();
  }
});

/**
 * NOTE: Do Not Use async/await in onMessage listeners
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'EXIT_CAPTURE') {
    captureStateStorage.setCaptureState('idle');
    captureTabStorage.setCaptureTabId(null);

    annotationsStorage.clearAll();
    annotationsRedoStorage.clearAll();
    sendResponse({ status: 'success' });
  }

  if (sender?.tab?.id) {
    if (message.type === 'ADD_RECORD') {
      // Merge fetch request data from content script
      addOrMergeRecords(sender.tab.id, message.data);
      sendResponse({ status: 'success' });
    }

    if (message.type === 'GET_RECORDS') {
      getRecords(sender.tab.id).then(records => sendResponse({ records }));
    }
  } else {
    console.log('[Background] - Add Records: No sender id');
  }

  if (message.action === 'checkNativeCapture') {
    sendResponse({ isAvailable: !!chrome.tabs?.captureVisibleTab });
  }

  if (message.action === 'captureVisibleTab') {
    // Handle the async operation
    chrome.tabs.captureVisibleTab(
      null, // Current window
      { format: 'jpeg', quality: 100 },
      dataUrl => {
        if (chrome.runtime.lastError) {
          console.error('Error capturing screenshot:', chrome.runtime.lastError);
          sendResponse({ success: false, message: chrome.runtime.lastError.message });
        } else {
          sendResponse({ success: true, dataUrl });
        }
      },
    );
  }

  return true; // Keep the connection open for async handling
});

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === 'install') {
    // Open a welcome page
    // await chrome.tabs.create({ url: 'welcome.html' });
  }

  /**
   * @todo
   * find a better way to reload the tabs that are open when install/update happens.
   * context: see issue: #24
   */
  if (['install', 'update'].includes(reason)) {
    const activeTabs = await chrome.tabs.query({});
    const activeTabIds = activeTabs.map(t => t.id).filter((id): id is number => id !== undefined);

    await pendingReloadTabsStorage.set(activeTabIds);
  }

  // Creates parent context menu item
  chrome.contextMenus.create({
    id: 'capture_parent',
    title: t('extensionName'),
    contexts: ['all'],
  });

  // Define the child options
  const captureOptions = [
    { id: 'area', title: t('area') },
    { id: 'full-page', title: t('fullPage') },
    { id: 'viewport', title: t('viewport') },
  ];

  captureOptions.forEach(({ id, title }) => {
    chrome.contextMenus.create({
      id,
      parentId: 'capture_parent',
      title,
      contexts: ['all'],
    });
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return; //skip if tab is invalid

  const type = info.menuItemId as 'area' | 'viewport' | 'full-page';

  // Updates capture state and active tab
  await captureStateStorage.setCaptureState('capturing');
  await captureTabStorage.setCaptureTabId(tab.id);

  // Sends message to contentScript to start capture
  if (type) {
    chrome.tabs.sendMessage(
      tab.id,
      {
        action: 'START_SCREENSHOT',
        payload: { type },
      },
      response => {
        if (chrome.runtime.lastError) {
          console.error('Error starting capture:', type, chrome.runtime.lastError.message);
        } else {
          console.log('Capture started:', type, response);
        }
      },
    );
  }
});

/**
 * @todo
 * there is an scenario when tabId is -1,
 * but we know the requestId and we can use it to populate the right request data
 *
 * related to all 3 web req states
 */

// Listener for onCompleted
chrome.webRequest.onCompleted.addListener(
  (request: chrome.webRequest.WebResponseCacheDetails) => {
    const clonedRequest = structuredClone(request);
    addOrMergeRecords(clonedRequest.tabId, {
      recordType: 'network',
      source: 'background',
      ...clonedRequest,
    });

    if (clonedRequest.statusCode >= 400) {
      addOrMergeRecords(clonedRequest.tabId, {
        timestamp: Date.now(),
        type: 'log',
        recordType: 'console',
        source: 'background',
        method: 'error',
        args: [
          `[${clonedRequest.type}] ${clonedRequest.method} ${clonedRequest.url} responded with status ${clonedRequest.statusCode}`,
          clonedRequest,
        ],
        stackTrace: {
          parsed: 'interceptFetch',
          raw: '',
        },
        pageUrl: clonedRequest.url,
      });
    }
  },
  { urls: ['<all_urls>'] },
);

// Listener for onBeforeRequest
chrome.webRequest.onBeforeRequest.addListener(
  (request: chrome.webRequest.WebRequestBodyDetails) => {
    addOrMergeRecords(request.tabId, {
      recordType: 'network',
      source: 'background',
      ...structuredClone(request),
    });
  },
  { urls: ['<all_urls>'] },
  ['requestBody'],
);

// Listener for onBeforeSendHeaders
chrome.webRequest.onBeforeSendHeaders.addListener(
  (request: chrome.webRequest.WebRequestHeadersDetails) => {
    addOrMergeRecords(request.tabId, {
      recordType: 'network',
      source: 'background',
      ...structuredClone(request),
    });
  },
  { urls: ['<all_urls>'] },
  ['requestHeaders'],
);
