import { createApi } from '@reduxjs/toolkit/query/react';

import type { Pagination, Space } from '@extension/shared';

import { TAG_TYPE } from '../../constants/tag-type.const.js';
import { baseQueryWithReauth } from '../../services/index.js';

export const spacesAPI = createApi({
  reducerPath: 'spaces',
  tagTypes: [TAG_TYPE.SPACES],
  baseQuery: baseQueryWithReauth,
  endpoints: build => ({
    createSpaces: build.mutation<Space[], Partial<any>>({
      invalidatesTags: [TAG_TYPE.SPACES],
      query: body => ({
        url: '/spaces',
        method: 'POST',
        body,
      }),
    }),

    getSpaces: build.query<{ items: Space[]; total: number }, Pagination>({
      providesTags: [TAG_TYPE.SPACES],
      query: params => ({
        url: '/spaces',
        params,
      }),
    }),
  }),
});
