import type { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';

import { aiAPI } from '../store/ai/ai.api.js';
import { organizationAPI } from '../store/organization/organization.api.js';
import { overviewAPI } from '../store/overview/overview.api.js';
import { screenshotAPI } from '../store/screenshot/screenshot.api.js';
import { slicesPrivateAPI } from '../store/slices/slices-private.api.js';
import { spacesAPI } from '../store/spaces/spaces.api.js';
import { subscriptionsAPI } from '../store/subscriptions/subscriptions.api.js';
import { userAPI } from '../store/user/user.api.js';
import { workspacesPrivateAPI } from '../store/workspaces/workspaces-private.api.js';

const privateApis = [
  userAPI,
  overviewAPI,
  slicesPrivateAPI,
  spacesAPI,
  subscriptionsAPI,
  organizationAPI,
  screenshotAPI,
  aiAPI,
  workspacesPrivateAPI,
];

export const resetAllApiState = (dispatch: ThunkDispatch<unknown, unknown, UnknownAction>): void => {
  for (const api of privateApis) {
    dispatch(api.util.resetApiState());
  }
};
