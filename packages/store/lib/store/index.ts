import { configureStore } from '@reduxjs/toolkit';
import { combineReducers } from 'redux';

import { authReducer, authPublicAPI } from './auth/index.js';
import { organizationAPI } from './organization/index.js';
import { overviewAPI } from './overview/index.js';
import { screenshotAPI } from './screenshot/index.js';
import { slicesPrivateAPI, slicesPublicAPI, slicesReducer } from './slices/index.js';
import { spacesAPI } from './spaces/index.js';
import { subscriptionsAPI } from './subscriptions/index.js';
import { userAPI } from './user/index.js';
import { workspacesPrivateAPI, workspacesPublicAPI, workspacesReducer } from './workspaces/index.js';

const rootReducer = combineReducers({
  [authPublicAPI.reducerPath]: authPublicAPI.reducer,
  authReducer,

  [userAPI.reducerPath]: userAPI.reducer,

  [overviewAPI.reducerPath]: overviewAPI.reducer,

  [slicesPrivateAPI.reducerPath]: slicesPrivateAPI.reducer,
  [slicesPublicAPI.reducerPath]: slicesPublicAPI.reducer,
  slicesReducer,

  [spacesAPI.reducerPath]: spacesAPI.reducer,

  [workspacesPrivateAPI.reducerPath]: workspacesPrivateAPI.reducer,
  [workspacesPublicAPI.reducerPath]: workspacesPublicAPI.reducer,
  workspacesReducer,

  [subscriptionsAPI.reducerPath]: subscriptionsAPI.reducer,

  [organizationAPI.reducerPath]: organizationAPI.reducer,

  [screenshotAPI.reducerPath]: screenshotAPI.reducer,
});

const setupStore = () =>
  configureStore({
    reducer: rootReducer,
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware()
        .concat(authPublicAPI.middleware)
        .concat(userAPI.middleware)
        .concat(overviewAPI.middleware)
        .concat(workspacesPrivateAPI.middleware)
        .concat(workspacesPublicAPI.middleware)
        .concat(slicesPrivateAPI.middleware)
        .concat(slicesPublicAPI.middleware)
        .concat(spacesAPI.middleware)
        .concat(subscriptionsAPI.middleware)
        .concat(organizationAPI.middleware)
        .concat(screenshotAPI.middleware),
  });

export const store = setupStore();

export type RootState = ReturnType<typeof rootReducer>;
export type AppStore = ReturnType<typeof setupStore>;
export type AppDispatch = AppStore['dispatch'];

export const { useLazyGetUserDetailsQuery, useGetUserDetailsQuery } = userAPI;
export const { useGetSubscriptionByIdQuery, useLazyGetSubscriptionByIdQuery } = subscriptionsAPI;
export const { useCreateSpacesMutation, useGetSpacesQuery, useLazyGetSpacesQuery } = spacesAPI;
export const { useGetWorkspacesQuery, useCreateWorkspaceMutation, useGetWorkspaceByIdQuery } = workspacesPrivateAPI;
export const { useGetWorkspacePublicByIdQuery } = workspacesPublicAPI;
export const { useGetSlicesQuery, useLazyGetSlicesQuery, useDeleteSliceByIdMutation, useCreateSliceMutation } =
  slicesPrivateAPI;
export const { useGetPublicSliceByIdQuery } = slicesPublicAPI;
export const { useGetOverviewQuery, useLazyGetOverviewQuery } = overviewAPI;
export const { useLoginGuestMutation } = authPublicAPI;
export const { useGetOrganizationByIdQuery } = organizationAPI;
export const { useLazyGetFullScreenshotQuery } = screenshotAPI;

// export const { setFilters, clearFilters } = slicesSlice.actions;
// export const { setFilters, clearFilters } = workspacesSlice.actions;
