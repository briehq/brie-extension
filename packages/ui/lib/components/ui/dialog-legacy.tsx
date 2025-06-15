import { clsx } from 'clsx';
import type { ReactNode } from 'react';

import { Button } from './button';
import { Icon } from './icon';

export const DialogLegacy = ({
  isMaximized,
  onClose,
  children,
  actions,
}: {
  isMaximized: boolean;
  onClose: () => void;
  children: ReactNode;
  actions: ReactNode;
}) => {
  return (
    <div className="relative z-[1000000]" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      {/* Background backdrop */}
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>

      <div className="fixed inset-0 z-10 overflow-y-auto">
        <div className={clsx('flex min-h-full items-center justify-center', { 'p-4': !isMaximized })}>
          {/* Modal panel */}
          <div
            className={clsx(
              'relative overflow-hidden bg-white transition-all',
              isMaximized ? 'h-screen w-full' : 'h-auto w-full rounded-lg shadow-xl sm:max-w-7xl',
            )}>
            {/* Close Button */}
            <div className="bg-background absolute right-4 top-2 z-10 rounded-lg sm:p-2">
              <div className="flex items-center gap-x-2">
                {actions}

                <Button size="icon" variant="secondary" onClick={onClose} type="button" className="size-6">
                  <Icon name={'X' as any} className="size-4" strokeWidth="1.5" />
                </Button>
              </div>
            </div>

            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
