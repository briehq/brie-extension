import type { Menus, Tabs } from 'webextension-polyfill';
import { contextMenus } from 'webextension-polyfill';

import { t } from '@extension/i18n';
import { sendMessageToTab } from '@extension/shared';
import { captureStateStorage, captureTabStorage } from '@extension/storage';

import type { CaptureType } from '@src/types';

export const addContextMenus = async (): Promise<void> => {
  try {
    try {
      await contextMenus.removeAll();
    } catch {
      // @todo
    }

    await contextMenus.create({
      id: 'capture_parent',
      title: t('extensionName'),
      contexts: ['all'],
    });

    const captureOptions: Array<{ id: CaptureType; title: string }> = [
      { id: 'area', title: t('area') },
      { id: 'full-page', title: t('fullPage') },
      { id: 'viewport', title: t('viewport') },
    ];

    await Promise.all(
      captureOptions.map(({ id, title }) =>
        contextMenus.create({
          id,
          parentId: 'capture_parent',
          title,
          contexts: ['all'],
        }),
      ),
    );
  } catch (e) {
    console.error('[background] ensureContextMenus error:', e);
  }
};

export const handleOnContextMenuClicked = async (info: Menus.OnClickData, tab?: Tabs.Tab) => {
  try {
    const tabId = tab?.id;
    if (!tabId) return;

    const type = info.menuItemId as CaptureType;
    if (!['area', 'full-page', 'viewport'].includes(type)) return;

    await captureStateStorage.setCaptureState('capturing');
    await captureTabStorage.setCaptureTabId(tabId);

    await sendMessageToTab(tabId, { action: 'START_SCREENSHOT', payload: { type } });
  } catch (e) {
    console.error('[background] onContextMenuClicked error:', e);
  }
};
