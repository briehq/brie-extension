import { useCallback, useEffect, useRef, useState } from 'react';

import { API_BASE_URL } from '@extension/env';
import type { User } from '@extension/shared';
import { AuthMethod, useStorage } from '@extension/shared';
import { authTokensStorage } from '@extension/storage';
import { useGetUserDetailsQuery } from '@extension/store';

type AuthPhase =
  | 'checking_health'
  | 'api_unavailable'
  | 'checking_auth'
  | 'authenticated'
  | 'unauthenticated'
  | 'error';

interface AuthState {
  phase: AuthPhase;
  user?: User;
  retry: () => void;
}

const checkHealth = async (signal: AbortSignal): Promise<boolean> => {
  if (!API_BASE_URL) return false;

  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'HEAD',
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
      signal,
    });

    return response.ok;
  } catch {
    return false;
  }
};

const useAuthState = (): AuthState => {
  const [phase, setPhase] = useState<AuthPhase>('checking_health');
  const [healthPassed, setHealthPassed] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const tokens = useStorage(authTokensStorage);
  const hasTokens = Boolean(tokens?.accessToken && tokens?.refreshToken);

  const skipUserQuery = !healthPassed || !hasTokens;

  const { data: user, isLoading, isError, error } = useGetUserDetailsQuery(undefined, { skip: skipUserQuery });

  // Health check on mount + retry
  const runHealthCheck = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setPhase('checking_health');
    setHealthPassed(false);

    const healthy = await checkHealth(controller.signal);

    if (controller.signal.aborted) return;

    if (healthy) {
      setHealthPassed(true);
    } else {
      setPhase('api_unavailable');
    }
  }, []);

  useEffect(() => {
    runHealthCheck();

    return () => {
      abortRef.current?.abort();
    };
  }, [runHealthCheck]);

  // Derive phase from health + tokens + query state
  useEffect(() => {
    if (!healthPassed) return;

    if (!hasTokens) {
      setPhase('unauthenticated');
      return;
    }

    // Waiting for initial user fetch
    if (isLoading) {
      setPhase('checking_auth');
      return;
    }

    if (isError) {
      const status = error && 'status' in error ? error.status : undefined;

      if (status === 401) {
        setPhase('unauthenticated');
      } else {
        setPhase('error');
      }
      return;
    }

    if (user) {
      if (!user.id || user.authMethod === AuthMethod.GUEST) {
        setPhase('unauthenticated');
      } else {
        setPhase('authenticated');
      }
    }
  }, [healthPassed, hasTokens, isLoading, isError, error, user]);

  const retry = useCallback(() => {
    runHealthCheck();
  }, [runHealthCheck]);

  return { phase, user, retry };
};

export { useAuthState };
export type { AuthPhase, AuthState };
