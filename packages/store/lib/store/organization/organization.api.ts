import { createApi } from '@reduxjs/toolkit/query/react';

import type { Organization } from '@extension/shared';

import { TAG_TYPE } from '../../constants/tag-type.const.js';
import { baseQueryWithReauth } from '../../services/index.js';

export const organizationAPI = createApi({
  reducerPath: 'organization',
  tagTypes: [TAG_TYPE.ORGANIZATION],
  baseQuery: baseQueryWithReauth,
  endpoints: build => ({
    getOrganizationById: build.query<Organization, void>({
      providesTags: [TAG_TYPE.ORGANIZATION],
      query: () => ({
        url: '/users/organization',
      }),
    }),
  }),
});
