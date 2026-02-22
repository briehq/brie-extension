import { t } from '@extension/i18n';
import { Alert, AlertDescription, Button } from '@extension/ui';

import { useAuthIdentityProvider } from '@src/hooks';

export const AuthView = () => {
  const { register, isLoading: authIsLoading, error } = useAuthIdentityProvider();

  return (
    <div className="lg:p-8">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-lg font-semibold tracking-tight">{t('reportBugsHeading')}</h1>

          <p className="text-muted-foreground text-sm">{t('getFullAccess')}</p>
        </div>

        <div className="mx-10 grid gap-1">
          <Button className="font-semibold" loading={authIsLoading} disabled={authIsLoading} onClick={register}>
            {t('continue')}
          </Button>
        </div>

        {error && (
          <Alert className="text-center" variant="destructive">
            <AlertDescription className="text-[12px]">{error.message || t('unexpectedError')}</AlertDescription>
          </Alert>
        )}

        <p className="text-muted-foreground text-center text-[11px]">
          {t('byClickingContinue')}
          <br />{' '}
          <a href="https://brie.io/terms" target="_blank" className="hover:text-primary underline underline-offset-4">
            {t('termsOfService')}
          </a>{' '}
          and{' '}
          <a href="https://brie.io/privacy" target="_blank" className="hover:text-primary underline underline-offset-4">
            {t('privacyPolicy')}
          </a>
          .
        </p>
      </div>
    </div>
  );
};
