import path from 'path';
import { fileURLToPath } from 'url';

import { config } from '@dotenvx/dotenvx';

import { CLI_ENV } from './const.js';

const getDirPath = () => {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    return path.resolve(__dirname, '../../../../.env');
  } catch (e) {
    console.warn('Using fallback path resolution for .env file');
    return path.resolve(process.cwd(), '.env');
  }
};

const baseEnv =
  config({
    path: getDirPath(),
  }).parsed ?? {};

if (!CLI_ENV) {
  console.warn('CLI_ENV is not defined. Check your environment or const.js export.');
}

const dynamicEnvValues = {
  NODE_ENV: CLI_ENV === 'dev' || baseEnv.DEV === 'true' ? 'development' : 'production',
} as const;

export { baseEnv, dynamicEnvValues };
