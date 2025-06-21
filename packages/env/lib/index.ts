import { config } from '@dotenvx/dotenvx';

import { CLI_ENV } from './const.js';

/**
 * @todo
 * check why CLI_ENV doesn't work
 * tentative to solve it #213 and #226
 */
export const baseEnv =
  config({
    path: `${import.meta.dirname}/../../../../.env`,
  }).parsed ?? {};

export const dynamicEnvValues = {
  NODE_ENV: baseEnv.CLI_DEV === 'true' ? 'development' : 'production',
} as const;
