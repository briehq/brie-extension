import { createApi } from '@reduxjs/toolkit/query/react';

import type { Subscription } from '@extension/shared';

import { TAG_TYPE } from '../../constants/tag-type.const.js';
import { baseQueryWithReauth } from '../../services/index.js';

export const subscriptionsAPI = createApi({
  reducerPath: 'subscriptions',
  tagTypes: [TAG_TYPE.SUBSCRIPTIONS],
  baseQuery: baseQueryWithReauth,
  endpoints: build => ({
    getSubscriptionById: build.query<Subscription, { id: string }>({
      providesTags: [TAG_TYPE.SUBSCRIPTIONS],
      query: ({ id }) => ({
        url: `/subscriptions/${id}`,
      }),
    }),
  }),
});
