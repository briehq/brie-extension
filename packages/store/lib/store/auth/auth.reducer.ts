import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

import type { AuthState, Tokens, User, UserAndTokensResponse } from '@extension/shared';
import { authTokensStorage } from '@extension/storage';

import { authPublicAPI } from './auth-public.api.js';
import { userAPI } from '../user/index.js';

const initialState: AuthState = {
  user: {} as User,
  tokens: {} as Tokens,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder.addMatcher(
      authPublicAPI.endpoints.loginGuest.matchFulfilled,
      (state, { payload }: PayloadAction<UserAndTokensResponse>) => {
        state.user = payload.user;
        state.tokens = payload.tokens;

        // const { organization } = payload.user;

        authTokensStorage.setTokens(payload.tokens);
      },
    );

    builder.addMatcher(userAPI.endpoints.getUserDetails.matchFulfilled, (state, { payload }: PayloadAction<User>) => {
      state.user = payload;
    });
  },
});
