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
