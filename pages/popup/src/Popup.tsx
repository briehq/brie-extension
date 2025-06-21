import '@src/Popup.css';

import { withErrorBoundary, withSuspense } from '@extension/shared';
import { store, ReduxProvider } from '@extension/store';

import { Skeleton } from './components/ui';
import { AuthGuard } from './guards';
import { PopupContent } from './popup-content';
import { ApiHealthProvider } from './providers';

const Popup = () => (
  <ApiHealthProvider>
    <ReduxProvider store={store}>
      <div className="dark:bg-background relative px-5 pb-5 pt-4">
        <AuthGuard>
          <PopupContent />
        </AuthGuard>
      </div>
    </ReduxProvider>
  </ApiHealthProvider>
);

export default withErrorBoundary(withSuspense(Popup, <Skeleton />), <div>Error Occurred</div>);
