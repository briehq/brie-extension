import { fetchBaseQuery } from '@reduxjs/toolkit/query';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { Mutex } from 'async-mutex';
import { toast } from 'react-hot-toast';

import { API_BASE_URL } from '@extension/env';
import type { Tokens, UserAndTokensResponse } from '@extension/shared';
import { authTokensStorage } from '@extension/storage';

const mutex = new Mutex();
const baseQuery = (type: 'access' | 'refresh') =>
  fetchBaseQuery({
    baseUrl: API_BASE_URL,
    prepareHeaders: async headers => {
      const tokens = await authTokensStorage.getTokens();
      const token = type === 'access' ? tokens.accessToken : tokens.refreshToken;

      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }

      return headers;
    },
  });

export const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  await mutex.waitForUnlock();
  const accessBaseQuery = baseQuery('access');
  let result = await accessBaseQuery(args, api, extraOptions);

  // if (result.error && import.meta.env.MODE === 'development') {
  //   console.warn(`[PRIVATE] ERROR: ${result?.error?.status} - ${(result.error?.data as any)?.message}`);
  // }

  if (result.error && result.error.status === 401) {
    if (!mutex.isLocked()) {
      const release = await mutex.acquire();
      try {
        const refreshBaseQuery = baseQuery('refresh');
        const refreshResult = await refreshBaseQuery({ url: '/auth/refresh', method: 'POST' }, api, extraOptions);

        if (refreshResult?.data) {
          await authTokensStorage.setTokens((refreshResult.data as UserAndTokensResponse).tokens);
          // retry the initial query
          result = await accessBaseQuery(args, api, extraOptions);
        } else {
          toast.loading('Sorry, you will be logged off, because your login session has expired.');

          setTimeout(() => {
            authTokensStorage.setTokens({} as Tokens);
            // location.reload();
          }, 4000);
        }
      } finally {
        // release must be called once the mutex should be released again.
        release();
      }
    } else {
      // wait until the mutex is available without locking it
      await mutex.waitForUnlock();
      result = await accessBaseQuery(args, api, extraOptions);
    }
  }

  return result;
};
