import { createApi } from '@reduxjs/toolkit/query/react';

import type { User } from '@extension/shared';

import { TAG_TYPE } from '../../constants/tag-type.const.js';
import { baseQueryWithReauth } from '../../services/index.js';

export const userAPI = createApi({
  reducerPath: 'user',
  baseQuery: baseQueryWithReauth,
  tagTypes: [TAG_TYPE.ME],
  endpoints: build => ({
    getUserDetails: build.query<User, void>({
      query: () => ({
        url: '/users/me',
      }),
      providesTags: () => [TAG_TYPE.ME],
    }),
  }),
});
