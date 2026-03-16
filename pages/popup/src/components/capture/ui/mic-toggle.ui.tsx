import type { FC } from 'react';
import { useCallback } from 'react';

import { t } from '@extension/i18n';
import { useStorage } from '@extension/shared';
import type { BaseStorage, RecordingSettings } from '@extension/storage';
import { recordingSettingsStorage } from '@extension/storage';
import { Button, Icon } from '@extension/ui';

export const MicToggleButton: FC = () => {
  const { mic } = useStorage<BaseStorage<RecordingSettings>>(recordingSettingsStorage);
  const micEnabled = mic?.enabled ?? true;
  const micPermission = mic?.permission ?? 'unknown';

  const handleOnToggleMic = useCallback(async () => {
    if (micPermission === 'denied') {
      /**
       * @todo
       * - open a option page that will show how to enable the mic
       * - ask user to: Clear the chrome-extension://<id> entry from chrome://settings/content/microphone
       *
       * chrome.runtime.openOptionsPage()
       */

      return;
    }

    if (micPermission === 'granted') {
      await recordingSettingsStorage.setMicEnabled(!micEnabled);
      return;
    }

    /**
     * @todo
     * - open a option page that will show how to enable the mic from prompt
     *
     * chrome.runtime.openOptionsPage()
     */
    chrome.tabs.create({
      url: chrome.runtime.getURL('mic-permission.html'),
      active: true,
    });
  }, [micEnabled, micPermission]);

  const isOff = micPermission === 'denied' || !micEnabled;

  const label = micPermission === 'denied' ? t('micPermissionDenied') : isOff ? t('enableMic') : t('disableMic');

  return (
    <Button type="button" variant="outline" className="mt-4 h-8 w-full" onClick={handleOnToggleMic}>
      <Icon name={isOff ? 'MicOff' : 'Mic'} className="h-4 w-4" /> <span>{label}</span>
    </Button>
  );
};
