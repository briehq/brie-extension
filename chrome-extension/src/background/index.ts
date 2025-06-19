import 'webextension-polyfill';
import { v4 as uuidv4 } from 'uuid';

import { t } from '@extension/i18n';
import {
  MessageType,
  MessageAction,
  CaptureState,
  CaptureType,
  RecordType,
  RecordSource,
  LogMethod,
  InstallReason,
  ContextType,
  ContextMenuId,
  ResponseStatus,
  ImageFormat,
  RequestProperty,
} from '@extension/shared';
import {
  annotationsRedoStorage,
  annotationsStorage,
  captureStateStorage,
  captureTabStorage,
  pendingReloadTabsStorage,
  userUUIDStorage,
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
    await captureStateStorage.setCaptureState(CaptureState.IDLE);
    await captureTabStorage.setCaptureTabId(null);

    annotationsStorage.setAnnotations([]);
    annotationsRedoStorage.setAnnotations([]);
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
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

  if (!capturedTabId && state === CaptureState.UNSAVED) {
    await captureStateStorage.setCaptureState(CaptureState.IDLE);
  }

  if (tabId === capturedTabId) {
    await captureStateStorage.setCaptureState(CaptureState.IDLE);
    await captureTabStorage.setCaptureTabId(null);

    annotationsStorage.setAnnotations([]);
    annotationsRedoStorage.setAnnotations([]);
  }
});

/**
 * NOTE: Do Not Use async/await in onMessage listeners
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === MessageType.EXIT_CAPTURE) {
    captureStateStorage.setCaptureState(CaptureState.IDLE);
    captureTabStorage.setCaptureTabId(null);

    annotationsStorage.setAnnotations([]);
    annotationsRedoStorage.setAnnotations([]);
    sendResponse({ status: ResponseStatus.SUCCESS });
  }

  if (sender?.tab?.id) {
    if (message.type === MessageType.ADD_RECORD) {
      // Merge fetch request data from content script
      addOrMergeRecords(sender.tab.id, message.data);
      sendResponse({ status: ResponseStatus.SUCCESS });
    }

    if (message.type === MessageType.GET_RECORDS) {
      getRecords(sender.tab.id).then(records => sendResponse({ records }));
    }
  } else {
    console.log('[Background] - Add Records: No sender id');
  }

  if (message.action === MessageAction.CHECK_NATIVE_CAPTURE) {
    sendResponse({ isAvailable: !!chrome.tabs?.captureVisibleTab });
  }

  if (message.action === MessageAction.CAPTURE_VISIBLE_TAB) {
    // Handle the async operation
    chrome.tabs.captureVisibleTab({ format: ImageFormat.JPEG, quality: 100 }, dataUrl => {
      if (chrome.runtime.lastError) {
        console.error('Error capturing screenshot:', chrome.runtime.lastError);
        sendResponse({ success: false, message: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true, dataUrl });
      }
    });
  }

  return true; // Keep the connection open for async handling
});

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === InstallReason.INSTALL) {
    const userUuid = await userUUIDStorage.get();
    if (!userUuid) await userUUIDStorage.update(uuidv4());
  }

  /**
   * @todo
  
   */
  if ([InstallReason.INSTALL, InstallReason.UPDATE].includes(reason as InstallReason)) {
    chrome.tabs.query({}, tabs => {
      tabs.forEach(tab => {
        if (tab.id) {
          pendingReloadTabsStorage.add(tab.id);
        }
      });
    });
  }

  // Creates parent context menu item
  chrome.contextMenus.create({
    id: ContextMenuId.CAPTURE_PARENT,
    title: t('extensionName'),
    contexts: [ContextType.ALL],
  });

  // Define the child options
  const captureOptions = [
    { id: CaptureType.AREA, title: t('area') },
    { id: CaptureType.FULL_PAGE, title: t('fullPage') },
    { id: CaptureType.VIEWPORT, title: t('viewport') },
  ];

  captureOptions.forEach(({ id, title }) => {
    chrome.contextMenus.create({
      id,
      parentId: ContextMenuId.CAPTURE_PARENT,
      title,
      contexts: [ContextType.ALL],
    });
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return; //skip if tab is invalid

  const type = info.menuItemId as CaptureType;

  // Updates capture state and active tab
  await captureStateStorage.setCaptureState(CaptureState.CAPTURING);
  await captureTabStorage.setCaptureTabId(tab.id);

  // Sends message to contentScript to start capture
  if (type) {
    chrome.tabs.sendMessage(
      tab.id,
      {
        action: MessageAction.START_SCREENSHOT,
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
      recordType: RecordType.NETWORK,
      source: RecordSource.BACKGROUND,
      ...clonedRequest,
    });

    if (clonedRequest.statusCode >= 400) {
      addOrMergeRecords(clonedRequest.tabId, {
        timestamp: Date.now(),
        type: RecordType.CONSOLE,
        recordType: RecordType.CONSOLE,
        source: RecordSource.BACKGROUND,
        method: LogMethod.ERROR,
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
      recordType: RecordType.NETWORK,
      source: RecordSource.BACKGROUND,
      ...structuredClone(request),
    });
  },
  { urls: ['<all_urls>'] },
  [RequestProperty.REQUEST_BODY],
);

// Listener for onBeforeSendHeaders
chrome.webRequest.onBeforeSendHeaders.addListener(
  (request: chrome.webRequest.WebRequestHeadersDetails) => {
    addOrMergeRecords(request.tabId, {
      recordType: RecordType.NETWORK,
      source: RecordSource.BACKGROUND,
      ...structuredClone(request),
    });
  },
  { urls: ['<all_urls>'] },
  [RequestProperty.REQUEST_HEADERS],
);
