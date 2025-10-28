import type { Runtime } from 'webextension-polyfill';
import { tabs } from 'webextension-polyfill';

import { pendingReloadTabsStorage } from '@extension/storage';

import { addContextMenus } from './menus.service';

export const handleOnInstalled = async ({ reason }: Runtime.OnInstalledDetailsType) => {
  try {
    if (reason === 'install') {
      /**
       * @todo
       * Open a welcome page
       * await tabs.create({ url: 'welcome.html' });
       */
    }

    /**
     * @todo
     * find a better way to reload the tabs that are open when install/update happens.
     * context: see issue: #24
     */
    if (['install', 'update'].includes(reason)) {
      const allTabs = await tabs.query({});
      const ids = allTabs.map(t => t.id).filter((id): id is number => typeof id === 'number');
      await pendingReloadTabsStorage.set(ids);
    }

    await addContextMenus();
  } catch (e) {
    console.error('[background] onInstalled error:', e);
  }
};
