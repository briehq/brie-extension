import { useCallback, useEffect, useState } from 'react';

import { recordingSettingsStorage } from '@extension/storage';
import { Button, Icon } from '@extension/ui';

type PageState = 'requesting' | 'granted' | 'denied' | 'error';

export const MicPermission = () => {
  const [state, setState] = useState<PageState>('requesting');
  const extensionId = chrome.runtime.id;

  const requestPermission = useCallback(async () => {
    setState('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      await recordingSettingsStorage.setMicPermission('granted');
      setState('granted');
      setTimeout(() => window.close(), 2000);
    } catch (err: any) {
      if (err?.name === 'NotAllowedError') {
        await recordingSettingsStorage.setMicPermission('denied');
        setState('denied');
      } else {
        setState('error');
      }
    }
  }, []);

  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-md text-center">
        <div className="bg-muted mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl">
          <Icon name={state === 'granted' ? 'Mic' : 'MicOff'} className="h-8 w-8" />
        </div>

        {state === 'requesting' && (
          <>
            <h1 className="text-foreground text-xl font-semibold">Microphone Permission</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Allow Brie to access your microphone to record audio with your screen captures.
            </p>
          </>
        )}

        {state === 'granted' && (
          <>
            <h1 className="text-xl font-semibold text-green-600 dark:text-green-400">Microphone Enabled</h1>
            <p className="text-muted-foreground mt-2 text-sm">You're all set. This tab will close automatically.</p>
          </>
        )}

        {state === 'denied' && (
          <>
            <h1 className="text-xl font-semibold text-red-600 dark:text-red-400">Microphone Access Denied</h1>
            <p className="text-muted-foreground mt-2 text-sm">Your browser blocked microphone access. To fix this:</p>
            <ol className="text-muted-foreground mt-4 space-y-2 text-left text-sm">
              <li>
                1. Open{' '}
                <code className="bg-muted rounded px-1 py-0.5 text-xs">chrome://settings/content/microphone</code>
              </li>
              <li>
                2. Find <code className="bg-muted rounded px-1 py-0.5 text-xs">chrome-extension://{extensionId}</code>{' '}
                in the blocked list
              </li>
              <li>3. Remove it from the list</li>
              <li>4. Come back here and click "Try again"</li>
            </ol>
            <Button onClick={requestPermission} className="mt-6">
              Try again
            </Button>
          </>
        )}

        {state === 'error' && (
          <>
            <h1 className="text-xl font-semibold text-red-600 dark:text-red-400">Something Went Wrong</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              An unexpected error occurred while requesting microphone access.
            </p>
            <Button onClick={requestPermission} className="mt-6">
              Try again
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
