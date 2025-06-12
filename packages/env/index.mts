import { baseEnv, dynamicEnvValues } from './lib/index';
import type { IEnv } from './lib/types';

export * from './lib/const';
export * from './lib/index';

const env = {
  ...baseEnv,
  ...dynamicEnvValues,
} as IEnv;

export default env;
