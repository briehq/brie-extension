'use client';

import type React from 'react';
import { useEffect, useState, useCallback } from 'react';

import { API_BASE_URL } from '@extension/env';

import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

interface ApiErrorHandlerProps {
  children: React.ReactNode;
  checkInterval?: number;
}

export const ApiErrorHandler = ({ children, checkInterval = 60000 }: ApiErrorHandlerProps) => {
  const [isApiAvailable, setIsApiAvailable] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  const checkEndpointAvailability = useCallback(async (url: string | undefined): Promise<boolean> => {
    if (!url) return false;

    try {
      const response = await fetch(url, {
        method: 'HEAD',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch (error) {
      if (url) {
        console.error(`Failed to connect to ${url}:`, error);
      }
      return false;
    }
  }, []);

  const checkAvailability = useCallback(async () => {
    const apiAvailable = await checkEndpointAvailability(API_BASE_URL);
    setIsApiAvailable(apiAvailable);

    if (!apiAvailable) {
      setRetryCount(prev => prev + 1);
    } else {
      setRetryCount(0);
    }
  }, [checkEndpointAvailability]);

  useEffect(() => {
    checkAvailability();
    const intervalId = setInterval(checkAvailability, checkInterval);
    return () => clearInterval(intervalId);
  }, [checkAvailability, checkInterval]);

  if (!isApiAvailable) {
    return (
      <Alert variant="destructive" className="mb-4 border-red-200">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
          <AlertTitle className="font-semibold text-red-800">Service Unavailable</AlertTitle>
        </div>
        <AlertDescription className="mt-2 text-red-700">
          We're sorry — our system is currently offline. We'll be back as soon as possible.
          {retryCount > 1 && <span className="mt-1 block text-sm text-red-600">Retry attempt: {retryCount}</span>}
        </AlertDescription>
      </Alert>
    );
  }

  return <>{children}</>;
};
