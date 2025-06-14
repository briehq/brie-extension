import globalConfig from '@extension/tailwindcss-config';
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['lib/**/*.tsx'],
  presets: [globalConfig],
};

export default config;
