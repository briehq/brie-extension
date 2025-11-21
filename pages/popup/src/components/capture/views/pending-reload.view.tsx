import { t } from '@extension/i18n';
import { Alert, AlertDescription, Button } from '@extension/ui';

interface PendingReloadProps {
  onRefresh: () => Promise<void>;
}

export const PendingReloadView: React.FC<PendingReloadProps> = ({ onRefresh }) => (
  <>
    <Alert className="text-center">
      <AlertDescription className="text-[12px]">
        {t('quickRefresh')} <br />
        {t('readyToGo')}
      </AlertDescription>
    </Alert>

    <div className="mt-4 flex gap-x-2">
      <Button type="button" size="sm" className="w-full" onClick={onRefresh}>
        {t('refreshPage')}
      </Button>
    </div>
  </>
);
