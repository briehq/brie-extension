import { t } from '@extension/i18n';
import { Alert, AlertDescription, AlertTitle, Button } from '@extension/ui';

interface AuthErrorViewProps {
  onRetry: () => void;
}

export const AuthErrorView = ({ onRetry }: AuthErrorViewProps) => (
  <Alert variant="destructive" className="border-red-200">
    <div className="flex items-center gap-2">
      <AlertTitle className="font-semibold text-red-800">{t('errorOccurred')}</AlertTitle>
    </div>
    <AlertDescription className="mt-2 text-red-700">{t('unexpectedError')}</AlertDescription>
    <Button variant="outline" size="sm" className="mt-3 w-full" onClick={onRetry}>
      {t('retry')}
    </Button>
  </Alert>
);
