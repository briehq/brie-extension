/**
 * Extracts access/refresh tokens from a URL fragment of the form:
 *    https://…/#access_token=XXX&refresh_token=YYY
 * Saves them in storage and returns the persisted object.
 *
 * @param url - The final redirect URL captured by the auth flow.
 * @returns    The stored { accessToken, refreshToken } object.
 */
import { authTokensStorage } from '@extension/storage';
import type { ITokens } from '@extension/storage';

export const persistTokens = async (url: string): Promise<ITokens> => {
  const fragment = new URL(url).hash.slice(1);
  const params = new URLSearchParams(fragment);

  const accessToken = params.get('access_token') ?? '';
  const refreshToken = params.get('refresh_token') ?? '';

  if (!accessToken) throw new Error('No access token found in callback URL');

  const tokens: ITokens = { accessToken, refreshToken };

  await authTokensStorage.setTokens(tokens);

  return tokens;
};
