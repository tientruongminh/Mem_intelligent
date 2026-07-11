import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#172033',
        canvas: '#f5f7fa',
        line: '#dce2e9',
        teal: '#087f8c',
        coral: '#d95d39',
      },
      boxShadow: { panel: '0 1px 2px rgba(23,32,51,.06), 0 8px 24px rgba(23,32,51,.05)' },
    },
  },
  plugins: [],
} satisfies Config;
