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

const HEALTH_CACHE_KEY = 'brie:health:cache';
const HEALTH_CACHE_TTL_MS = 30_000;
const HEALTH_FETCH_TIMEOUT_MS = 8_000;

type HealthCache = { ok: boolean; checkedAt: number };

const fetchHealth = async (signal: AbortSignal): Promise<boolean> => {
  if (!API_BASE_URL) return false;

  // The outer controller aborts on component unmount / new run; this inner controller adds a
  // bounded timeout so a hung network call doesn't strand the user on `api_unavailable` forever.
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), HEALTH_FETCH_TIMEOUT_MS);
  const onParentAbort = () => timeoutController.abort();
  signal.addEventListener('abort', onParentAbort, { once: true });

  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'HEAD',
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
      signal: timeoutController.signal,
    });

    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
    signal.removeEventListener('abort', onParentAbort);
  }
};

const readHealthCache = async (): Promise<HealthCache | null> => {
  try {
    const session = chrome?.storage?.session;
    if (!session) return null;
    const result = await session.get([HEALTH_CACHE_KEY]);
    const cached = result[HEALTH_CACHE_KEY] as HealthCache | undefined;
    if (!cached || typeof cached.checkedAt !== 'number') return null;
    if (Date.now() - cached.checkedAt > HEALTH_CACHE_TTL_MS) return null;
    return cached;
  } catch {
    return null;
  }
};

const writeHealthCache = async (ok: boolean): Promise<void> => {
  try {
    await chrome?.storage?.session?.set({ [HEALTH_CACHE_KEY]: { ok, checkedAt: Date.now() } });
  } catch {
    // Best-effort cache; ignore quota/permission errors.
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

  // Health check on mount + retry. Uses chrome.storage.session as a 30s SWR cache so reopening the
  // popup doesn't gate first paint on a network round-trip.
  const runHealthCheck = useCallback(async (options?: { skipCache?: boolean }) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const cached = options?.skipCache ? null : await readHealthCache();

    if (controller.signal.aborted) return;

    if (cached) {
      // Render immediately from cache, then revalidate in the background. Surfaces stale failure
      // states via revalidation rather than blocking.
      if (cached.ok) {
        setHealthPassed(true);
      } else {
        setPhase('api_unavailable');
      }
    } else {
      setPhase('checking_health');
      setHealthPassed(false);
    }

    const healthy = await fetchHealth(controller.signal);

    if (controller.signal.aborted) return;

    void writeHealthCache(healthy);

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
    // User-initiated retry bypasses cache.
    runHealthCheck({ skipCache: true });
  }, [runHealthCheck]);

  return { phase, user, retry };
};

export { useAuthState };
export type { AuthPhase, AuthState };
