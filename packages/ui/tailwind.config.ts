import type { Config } from 'tailwindcss';

import globalConfig from '@extension/tailwindcss-config';

const config: Config = {
  content: ['lib/**/*.tsx'],
  presets: [globalConfig],
};

export default config;
