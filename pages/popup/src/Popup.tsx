import '@src/Popup.css';

import { withErrorBoundary, withSuspense } from '@extension/shared';
import { store, ReduxProvider } from '@extension/store';
import { ApiErrorHandler } from '@extension/ui';

import { AuthGuard } from './components/guards';
import { Skeleton } from './components/ui';
import { PopupContent } from './popup-content';

const Popup = () => (
  <ReduxProvider store={store}>
    <div className="dark:bg-background relative px-5 pb-5 pt-4">
      <ApiErrorHandler>
        <AuthGuard>
          <PopupContent />
        </AuthGuard>
      </ApiErrorHandler>
    </div>
  </ReduxProvider>
);

export default withErrorBoundary(withSuspense(Popup, <Skeleton />), <div>Error Occurred</div>);
