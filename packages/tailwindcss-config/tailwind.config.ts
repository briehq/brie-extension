import type { Config } from 'tailwindcss';

export default {
  theme: {
    extend: {
      colors: {
        black: '#18181b',
      },
    },
  },
  plugins: [],
} as Omit<Config, 'content'>;
