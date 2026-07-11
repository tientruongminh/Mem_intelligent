import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Charcoal ink on cool stone — B2B CRM (navy + sky), not clinic teal
        ink: '#0B1220',
        'ink-muted': '#5B6475',
        'ink-subtle': '#8B93A3',
        canvas: '#F3F5F8',
        'canvas-subtle': '#E9EDF3',
        surface: '#FFFFFF',
        line: '#DCE2EB',
        'line-subtle': '#E9EDF3',
        teal: '#1D4ED8',
        coral: '#DC2626',
        accent: {
          DEFAULT: '#1D4ED8',
          hover: '#1E40AF',
          muted: '#E8EFFC',
          foreground: '#1E3A8A',
        },
        success: {
          DEFAULT: '#059669',
          muted: '#ECFDF5',
          foreground: '#047857',
        },
        warning: {
          DEFAULT: '#D97706',
          muted: '#FFFBEB',
          foreground: '#B45309',
        },
        danger: {
          DEFAULT: '#DC2626',
          muted: '#FEF2F2',
          foreground: '#B91C1C',
        },
        sidebar: {
          DEFAULT: '#0B1220',
          border: '#1C2536',
          muted: '#9AA3B2',
          active: '#152033',
          text: '#E8ECF2',
        },
      },
      borderRadius: {
        DEFAULT: '10px',
        lg: '12px',
        xl: '16px',
      },
      boxShadow: {
        panel: '0 1px 2px rgba(11,18,32,.04), 0 1px 3px rgba(11,18,32,.03)',
        'panel-hover': '0 4px 12px rgba(11,18,32,.06), 0 2px 4px rgba(11,18,32,.04)',
        elevated: '0 12px 32px rgba(11,18,32,.10), 0 2px 8px rgba(11,18,32,.04)',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
