import type { AuthMethod } from '../constants';

export interface AuthState {
  user: User;
  tokens: Tokens;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserAndTokensResponse {
  user: User;
  tokens: Tokens;
}

export interface User {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  email: string | null;
  authMethod: AuthMethod;
  role?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatarId?: string;
  username: string;
}
