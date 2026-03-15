import '@src/Popup.css';

import { useEffect, useState } from 'react';

import { t } from '@extension/i18n';
import { useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { themeStorage } from '@extension/storage';
import { store, ReduxProvider } from '@extension/store';
import { Separator } from '@extension/ui';

import { BetaNotifier, Header, Skeleton } from './components/ui';
import { AuthGuard } from './guards';
import { PopupContent } from './popup-content';
import { AuthStateProvider } from './providers';

const Popup = () => {
  const theme = useStorage(themeStorage);
  const [showSlicesHistory, setShowSlicesHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    document.body.classList.add(theme);

    return () => document.body.classList.remove(theme);
  }, [theme]);

  return (
    <div className="dark:bg-background.dark relative px-5 pb-5 pt-4">
      <ReduxProvider store={store}>
        <AuthStateProvider>
          <AuthGuard>
            <div className="flex flex-col gap-y-4">
              <Header onSlicesHistory={() => setShowSlicesHistory(true)} onSettings={() => setShowSettings(true)} />
              <Separator className="bg-border/60" />
              <PopupContent
                showSlicesHistory={showSlicesHistory}
                showSettings={showSettings}
                setShowSlicesHistory={setShowSlicesHistory}
                setShowSettings={setShowSettings}
              />
              <Separator className="bg-border/60" />
              <BetaNotifier />
            </div>
          </AuthGuard>
        </AuthStateProvider>
      </ReduxProvider>
    </div>
  );
};

export default withErrorBoundary(withSuspense(Popup, <Skeleton />), <div>{t('errorOccurred')}</div>);
