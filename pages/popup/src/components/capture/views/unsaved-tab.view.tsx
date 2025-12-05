import { t } from '@extension/i18n';
import { Alert, AlertDescription, AlertTitle, Button } from '@extension/ui';

interface UnsavedTabProps {
  onDiscard: () => Promise<void>;
  onOpenActiveTab: () => Promise<void>;
}

export const UnsavedTabView: React.FC<UnsavedTabProps> = ({ onDiscard, onOpenActiveTab }) => (
  <>
    <Alert className="text-center">
      <AlertTitle className="text-[14px]">{t('saveOrDiscardChanges')}</AlertTitle>
      <AlertDescription className="text-[12px]">
        {t('unsavedChanges')} <br /> {t('inAnotherTab')}
      </AlertDescription>
    </Alert>

    <div className="mt-4 flex gap-x-2">
      <Button variant="secondary" type="button" size="sm" className="w-full" onClick={onDiscard}>
        {t('discard')}
      </Button>
      <Button type="button" size="sm" className="w-full" onClick={onOpenActiveTab}>
        {t('openActiveTab')}
      </Button>
    </div>
  </>
);
