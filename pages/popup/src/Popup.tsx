import '@src/Popup.css';

import { useEffect } from 'react';

import { t } from '@extension/i18n';
import { useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { themeStorage } from '@extension/storage';
import { store, ReduxProvider } from '@extension/store';
import { Separator } from '@extension/ui';

import { BetaNotifier, Header, Skeleton } from './components/ui';
import { AuthGuard } from './guards';
import { PopupContent } from './popup-content';
import { ApiHealthProvider } from './providers';

const Popup = () => {
  const theme = useStorage(themeStorage);

  useEffect(() => {
    document.body.classList.add(theme);

    return () => document.body.classList.remove(theme);
  }, [theme]);

  return (
    <div className="dark:bg-background.dark relative px-5 pb-5 pt-4">
      <ApiHealthProvider>
        <ReduxProvider store={store}>
          <AuthGuard>
            <div className="flex flex-col gap-y-4">
              <Header />
              <Separator className="bg-border/60" />
              <PopupContent />
              <Separator className="bg-border/60" />
              <BetaNotifier />
            </div>
          </AuthGuard>
        </ReduxProvider>
      </ApiHealthProvider>
    </div>
  );
};

export default withErrorBoundary(withSuspense(Popup, <Skeleton />), <div>{t('errorOccurred')}</div>);
