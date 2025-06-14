import { t } from '@extension/i18n';
import { useStorage } from '@extension/shared';
import { userUUIDStorage } from '@extension/storage';
import { useLoginGuestMutation } from '@extension/store';
import { Alert, AlertDescription, Button } from '@extension/ui';

import { useAuthIdentityProvider } from '@src/hooks';

export const AuthView = () => {
  const uuid = useStorage(userUUIDStorage);

  const { register, isLoading: authIsLoading, error } = useAuthIdentityProvider();
  const [loginGuest, { isLoading: loginGuestIsLoading }] = useLoginGuestMutation();

  /**
   * @todo
   * if is guest:
   * - check if  expired both, access token and refresh token
   * - and login back using the existing uuid (the uuid should be stored)
   */

  return (
    <div className="lg:p-8">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-lg font-semibold tracking-tight">Report bugs in seconds</h1>

          <p className="text-muted-foreground text-sm">
            Get full access with your email,
            <br />
            or a quick peek as a guest.
          </p>
        </div>

        <div className="mx-10 grid gap-1">
          <Button
            className="font-semibold"
            loading={authIsLoading}
            disabled={authIsLoading || loginGuestIsLoading}
            onClick={register}>
            Continue with email
          </Button>

          <Button
            type="button"
            variant="link"
            loading={loginGuestIsLoading}
            disabled={loginGuestIsLoading || authIsLoading}
            className="text-muted-foreground text-[13px]"
            onClick={() => uuid && loginGuest({ uuid })}>
            Continue as a guest
          </Button>
        </div>

        {error && (
          <Alert className="text-center" variant="destructive">
            <AlertDescription className="text-[12px]">{error.message || t('unexpectedError')}</AlertDescription>
          </Alert>
        )}

        <p className="text-muted-foreground text-center text-[11px]">
          By clicking "Continue",
          <br />
          you agree to our{' '}
          <a href="https://brie.io/terms" target="_blank" className="hover:text-primary underline underline-offset-4">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="https://brie.io/privacy" target="_blank" className="hover:text-primary underline underline-offset-4">
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </div>
  );
};
