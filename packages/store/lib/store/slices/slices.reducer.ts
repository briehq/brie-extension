import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

import type { Pagination } from '@extension/shared';

const initialState: { filters: Partial<Pagination> } = {
  filters: {} as Partial<Pagination>,
};

export const slicesSlice = createSlice({
  name: 'slices',
  initialState,
  reducers: {
    setFilters(state, action: PayloadAction<Partial<Pagination>>) {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters(state, action: PayloadAction<string | undefined>) {
      if (action.payload === 'status') {
        delete state.filters.status;
        return;
      }

      if (action.payload === 'q') {
        delete state.filters.q;
        return;
      }

      if (action.payload === 'priority') {
        delete state.filters.priority;
        return;
      }

      if (action.payload === 'workspaceId') {
        delete state.filters.workspaceId;
        return;
      }

      state.filters = {};
    },
  },
  extraReducers: () => {},
});
