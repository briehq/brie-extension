import { t } from '@extension/i18n';
import { Alert, AlertDescription, AlertTitle, Button } from '@extension/ui';

interface ApiUnavailableViewProps {
  onRetry: () => void;
}

export const ApiUnavailableView = ({ onRetry }: ApiUnavailableViewProps) => (
  <Alert variant="destructive" className="border-red-200">
    <div className="flex items-center gap-2">
      <div className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
      <AlertTitle className="font-semibold text-red-800">{t('serviceUnavailable')}</AlertTitle>
    </div>
    <AlertDescription className="mt-2 text-red-700">
      {t('systemOffline')} <br />
      {t('backSoon')}
    </AlertDescription>
    <Button variant="outline" size="sm" className="mt-3 w-full" onClick={onRetry}>
      {t('retry')}
    </Button>
  </Alert>
);
