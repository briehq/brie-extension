import '@src/Popup.css';

import { withErrorBoundary, withSuspense } from '@extension/shared';
import { store, ReduxProvider } from '@extension/store';

import { Skeleton } from './components/ui';
import { PopupContent } from './popup-content';

const Popup = () => (
  <ReduxProvider store={store}>
    <div className="light dark:bg-background.dark relative px-5 pb-5 pt-4">
      <PopupContent />
    </div>
  </ReduxProvider>
);

export default withErrorBoundary(withSuspense(Popup, <Skeleton />), <div>Error Occurred</div>);
