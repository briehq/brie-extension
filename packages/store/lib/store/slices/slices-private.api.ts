import { createApi } from '@reduxjs/toolkit/query/react';

import { API_BASE_URL } from '@extension/env';
import type {
  Slice,
  Pagination,
  InitSliceResponse,
  InitSliceRequest,
  AssetUploadResponse,
  UpdateSliceState,
} from '@extension/shared';

import { baseQueryWithReauth } from '../../services/index.js';

export const attachmentUrlPath = (a: Slice) => {
  const uploadPaths = {
    'image/jpeg': 'images/slices',
    default: 'records',
  };

  const uploadPath = (uploadPaths as any)[a.type] || uploadPaths.default;
  return `${API_BASE_URL}/uploads/${uploadPath}/${a.externalId}`;
};

/**
 * @note
 * RTK Query invalidation works only inside the same Redux store instance
 *
 * In a browser extension:
 * - Popup has its own isolated context and Redux store
 * - Content scripts also run in a separate context with a separate store
 *
 * So even if you await createSlice() in the content script,
 * the mutation result won't invalidate or notify the popup's cache,
 * because they're using different instances of the RTK Query cache.
 */
export const slicesPrivateAPI = createApi({
  reducerPath: 'slices-private',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['SLICE', 'SLICES'],
  endpoints: build => ({
    getSlices: build.query<{ items: Slice[]; total: number; hasItems: boolean; totalToday: number }, Pagination>({
      providesTags: ['SLICES'],
      query: params => ({
        url: '/slices',
        params,
      }),
      transformResponse: (response: { items: Slice[]; total: number; hasItems: boolean; totalToday: number }) => ({
        hasItems: response.hasItems,
        total: response.total,
        totalToday: response.totalToday,
        items: response.items.map((i: Slice) => ({
          ...i,
          labels: typeof i.labels === 'string' ? JSON.parse(i.labels) : i.labels,
          attachments: i.attachments.map((a: any) => ({
            ...a,
            preview: attachmentUrlPath(a),
          })),
        })),
      }),
    }),

    createSlice: build.mutation<Slice, Partial<{ primary: File; secondary: File; records: File }>>({
      invalidatesTags: ['SLICES'],
      query: body => ({
        url: '/slices',
        method: 'POST',
        body,
      }),
    }),

    deleteSliceById: build.mutation<Slice, string>({
      invalidatesTags: ['SLICES'],
      query: externalId => ({
        url: `/slices/${externalId}`,
        method: 'DELETE',
      }),
    }),

    initSlice: build.mutation<
      InitSliceResponse,
      {
        body: InitSliceRequest;
        headers: { 'Idempotency-Key': string };
      }
    >({
      invalidatesTags: ['SLICES'],
      query: ({ body, headers }) => {
        console.log('headers', headers);

        return {
          url: '/slices/init',
          method: 'POST',
          headers,
          body,
        };
      },
    }),

    uploadAsset: build.mutation<AssetUploadResponse, { sliceId: string; assetId: string; file: File }>({
      invalidatesTags: ['SLICE'],
      query: ({ sliceId, assetId, file }) => {
        const formData = new FormData();
        formData.append('file', file);

        return {
          url: `/slices/${sliceId}/assets/${assetId}`,
          method: 'POST',
          body: formData,
        };
      },
    }),

    updateSliceState: build.mutation<UpdateSliceState, UpdateSliceState>({
      invalidatesTags: ['SLICE'],
      query: ({ id, state }) => ({
        url: `/slices/${id}/state`,
        method: 'PATCH',
        body: { state },
      }),
    }),
  }),
});
