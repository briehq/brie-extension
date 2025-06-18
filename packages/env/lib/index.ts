import path from 'path';
import { fileURLToPath } from 'url';

import { config } from '@dotenvx/dotenvx';

import { CLI_ENV } from './const.js';

/**
 * @todo
 * check why CLI_ENV doesn't work
 */

const getDirPath = () => {
  try {
    // This will only work if running in ESM; otherwise will throw
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    return path.resolve(__dirname, '../../../../.env');
  } catch (e) {
    // Fallback for non-ESM or during eval
    console.warn('Using fallback path resolution for .env file');
    return path.resolve(process.cwd(), '.env');
  }
};

export const baseEnv =
  config({
    path: getDirPath(),
  }).parsed ?? {};

export const dynamicEnvValues = {
  NODE_ENV: baseEnv.DEV === 'true' ? 'development' : 'production',
} as const;
