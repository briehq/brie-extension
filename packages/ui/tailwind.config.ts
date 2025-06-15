import type { Config } from 'tailwindcss';

import globalConfig from '@extension/tailwindcss-config';

export default {
  content: ['lib/**/*.tsx'],
  presets: [globalConfig],
} satisfies Config;
