import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

import { API_BASE_URL } from '@extension/env';
import type { UserAndTokensResponse } from '@extension/shared';

export const authPublicAPI = createApi({
  reducerPath: 'authPublic',
  baseQuery: fetchBaseQuery({ baseUrl: API_BASE_URL }),
  endpoints: build => ({
    loginGuest: build.mutation<UserAndTokensResponse, { uuid: string }>({
      query: body => ({
        url: '/auth/login/guest',
        method: 'POST',
        body,
      }),
    }),
  }),
});
