import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          base: 'hsl(220 14% 6%)',
          subtle: 'hsl(220 14% 8%)',
          raised: 'hsl(220 14% 10%)',
          overlay: 'hsl(220 14% 12%)',
          inverted: 'hsl(220 14% 96%)',
        },
        border: {
          subtle: 'hsl(220 12% 14%)',
          default: 'hsl(220 12% 18%)',
          strong: 'hsl(220 12% 26%)',
        },
        fg: {
          muted: 'hsl(220 8% 52%)',
          subtle: 'hsl(220 8% 68%)',
          default: 'hsl(220 14% 92%)',
          strong: 'hsl(0 0% 100%)',
          inverted: 'hsl(220 14% 8%)',
        },
        accent: {
          DEFAULT: 'hsl(214 100% 60%)',
          hover: 'hsl(214 100% 66%)',
          subtle: 'hsl(214 70% 22%)',
          fg: 'hsl(0 0% 100%)',
        },
        success: {
          DEFAULT: 'hsl(142 70% 45%)',
          subtle: 'hsl(142 50% 18%)',
        },
        warning: {
          DEFAULT: 'hsl(38 92% 56%)',
          subtle: 'hsl(38 60% 18%)',
        },
        danger: {
          DEFAULT: 'hsl(0 78% 60%)',
          hover: 'hsl(0 78% 66%)',
          subtle: 'hsl(0 50% 22%)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '0.875rem' }],
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.8125rem', { lineHeight: '1.125rem' }],
        base: ['0.875rem', { lineHeight: '1.25rem' }],
        md: ['0.9375rem', { lineHeight: '1.375rem' }],
        lg: ['1.0625rem', { lineHeight: '1.5rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
      },
      borderRadius: {
        sm: '0.25rem',
        DEFAULT: '0.375rem',
        md: '0.5rem',
        lg: '0.625rem',
      },
      boxShadow: {
        elevated: '0 1px 0 hsl(220 14% 4% / 0.6), 0 8px 24px -8px hsl(220 14% 0% / 0.5)',
        focus: '0 0 0 1.5px hsl(214 100% 60% / 0.4)',
      },
      transitionTimingFunction: {
        precise: 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
