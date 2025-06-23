import '@src/Popup.css';

import { useEffect } from 'react';

import { useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { themeStorage } from '@extension/storage';
import { store, ReduxProvider } from '@extension/store';

import { Skeleton } from './components/ui';
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
            <PopupContent />
          </AuthGuard>
        </ReduxProvider>
      </ApiHealthProvider>
    </div>
  );
};

export default withErrorBoundary(withSuspense(Popup, <Skeleton />), <div>Error Occurred</div>);
