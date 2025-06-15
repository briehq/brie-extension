import type { Config } from 'tailwindcss';

export default {
  theme: {
    extend: {
      colors: {
        black: '#0f0f0f',
      },
    },
  },
  plugins: [],
} as Omit<Config, 'content'>;
