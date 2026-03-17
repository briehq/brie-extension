import { createApi } from '@reduxjs/toolkit/query/react';

import type { GenerateBody, GenerateResponse } from '@extension/shared';

import { TAG_TYPE } from '../../constants/tag-type.const.js';
import { baseQueryWithReauth } from '../../services/index.js';

export const aiAPI = createApi({
  reducerPath: 'ai',
  tagTypes: [TAG_TYPE.AI_GENERATE, TAG_TYPE.AI_TRANSCRIPTION],
  baseQuery: baseQueryWithReauth,
  endpoints: build => ({
    getTranscription: build.mutation<any, any>({
      invalidatesTags: [TAG_TYPE.AI_TRANSCRIPTION],
      query: body => ({
        url: '/ai/speech-to-text',
        method: 'POST',
        body,
      }),
    }),

    generateWithAI: build.mutation<string[], GenerateBody>({
      invalidatesTags: [TAG_TYPE.AI_GENERATE],
      query: body => ({
        url: '/ai/generate',
        method: 'POST',
        body,
      }),
    }),
  }),
});
