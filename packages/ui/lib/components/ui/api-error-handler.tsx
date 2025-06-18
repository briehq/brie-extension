import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';

import { API_BASE_URL, APP_BASE_URL } from '@extension/env';

import { Alert, AlertDescription, AlertTitle } from './alert';

interface ApiErrorHandlerProps {
  children: React.ReactNode;
  checkInterval?: number; // Allow customizing the check interval
  showToast?: boolean; // Allow disabling toast notifications
}

export const ApiErrorHandler = ({
  children,
  checkInterval = 60000, // Default to checking every minute
  showToast = true,
}: ApiErrorHandlerProps) => {
  const [isApiAvailable, setIsApiAvailable] = useState(true);
  const [isAppAvailable, setIsAppAvailable] = useState(true);
  const [showError, setShowError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Extracted check logic into a reusable function
  const checkEndpointAvailability = useCallback(async (url: string | undefined): Promise<boolean> => {
    if (!url) return false; // Skip check if URL is not defined and consider it unavailable

    try {
      const response = await fetch(url, {
        method: 'HEAD',
        // Add cache control to prevent cached responses
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
        // Add a timeout to prevent long-hanging requests
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch (error) {
      // Only log errors when URLs are defined
      if (url) {
        console.error(`Failed to connect to ${url}:`, error);
      }
      return false;
    }
  }, []);

  const checkAvailability = useCallback(async () => {
    const apiAvailable = await checkEndpointAvailability(API_BASE_URL);
    const appAvailable = await checkEndpointAvailability(APP_BASE_URL);

    setIsApiAvailable(apiAvailable);
    setIsAppAvailable(appAvailable);

    // Increment retry count if both services are unavailable
    if (!apiAvailable && !appAvailable) {
      setRetryCount(prev => prev + 1);
    } else {
      // Reset retry count if any service becomes available
      setRetryCount(0);
    }
  }, [checkEndpointAvailability]);

  // Check availability on mount and periodically
  useEffect(() => {
    // Initial check
    checkAvailability();

    // Set up interval for periodic checks
    const intervalId = setInterval(checkAvailability, checkInterval);

    return () => clearInterval(intervalId);
  }, [checkAvailability, checkInterval]);

  // Update showError state when API availability changes
  useEffect(() => {
    const bothUnavailable = !isApiAvailable && !isAppAvailable;

    setShowError(bothUnavailable);

    // Show toast notification only on first detection or every 5 retries
    if (bothUnavailable && showToast && (retryCount === 1 || retryCount % 5 === 0)) {
      toast.error('API services are currently unavailable');
    } else if (!bothUnavailable && retryCount > 0) {
      // Show recovery notification
      toast.success('Connection to services restored');
    }
  }, [isApiAvailable, isAppAvailable, retryCount, showToast]);

  return (
    <>
      {showError && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Service Unavailable</AlertTitle>
          <AlertDescription>
            We're sorry — our system is currently offline. We'll be back as soon as possible.
          </AlertDescription>
        </Alert>
      )}
      {children}
    </>
  );
};
