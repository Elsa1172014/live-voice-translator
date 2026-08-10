import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#0a0f1f',
          900: '#0e1526',
          800: '#141d33',
          700: '#1c2942',
          600: '#28395c',
          500: '#374d78',
        },
        gold: {
          400: '#e8c76f',
          500: '#d4af37',
          600: '#b8942c',
        },
        sage: {
          400: '#6fbf9a',
          500: '#4f9d7c',
          600: '#3c7a61',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        arabic: ['var(--font-tajawal)', 'Tahoma', 'sans-serif'],
      },
      keyframes: {
        pulseSoft: {
          '0%,100%': { transform: 'scale(1)', opacity: '0.9' },
          '50%': { transform: 'scale(1.06)', opacity: '1' },
        },
        wave: {
          '0%,100%': { transform: 'scaleY(0.4)' },
          '50%': { transform: 'scaleY(1)' },
        },
      },
      animation: {
        pulseSoft: 'pulseSoft 2.2s ease-in-out infinite',
        wave: 'wave 1s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
