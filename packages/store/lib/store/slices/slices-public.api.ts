import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

import { API_BASE_URL } from '@extension/env';
import type { Slice } from '@extension/shared';

import { attachmentUrlPath } from './slices-private.api.js';

export const slicesPublicAPI = createApi({
  reducerPath: 'slices-public',
  baseQuery: fetchBaseQuery({ baseUrl: API_BASE_URL }),
  endpoints: build => ({
    getPublicSliceById: build.query<Slice, { id: string }>({
      query: ({ id }) => ({
        url: `/slices/public/${id}`,
      }),
      transformResponse: (slice: Slice) => ({
        ...slice,
        labels: typeof slice.labels === 'string' ? JSON.parse(slice.labels) : slice.labels,
        attachments: slice.attachments.map((a: any) => ({
          ...a,
          preview: attachmentUrlPath(a),
        })),
      }),
    }),
  }),
});
