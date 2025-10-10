import { createApi } from '@reduxjs/toolkit/query/react';

import type { GenerateBody, GenerateResponse } from '@extension/shared';

import { baseQueryWithReauth } from '../../services/index.js';

export const aiAPI = createApi({
  reducerPath: 'ai',
  tagTypes: ['AI_GENERATE', 'AI_TRANSCRIPTION'],
  baseQuery: baseQueryWithReauth,
  endpoints: build => ({
    getTranscription: build.mutation<any, any>({
      invalidatesTags: ['AI_TRANSCRIPTION'],
      query: body => ({
        url: '/ai/speech-to-text',
        method: 'POST',
        body,
      }),
    }),

    generateWithAI: build.mutation<string[], GenerateBody>({
      invalidatesTags: ['AI_GENERATE'],
      query: body => ({
        url: '/ai/generate',
        method: 'POST',
        body,
      }),
    }),
  }),
});
