import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary color - Modern indigo
        primary: {
          DEFAULT: '#6366F1',
          50: '#EDEEFF',
          100: '#DBD9FF',
          200: '#BEB9FF',
          300: '#A099FF',
          400: '#8179FF',
          500: '#6366F1', // Main primary
          600: '#4345D9',
          700: '#3334B0',
          800: '#252688',
          900: '#181960',
        },
        // Secondary color - Vibrant pink
        secondary: {
          DEFAULT: '#EC4899',
          50: '#FDF2F8',
          100: '#FCE7F3',
          200: '#FBCFE8',
          300: '#F9A8D4',
          400: '#F472B6',
          500: '#EC4899', // Main secondary
          600: '#DB2777',
          700: '#BE185D',
          800: '#9D174D',
          900: '#831843',
        },
        // Utility colors
        success: {
          DEFAULT: '#10B981',
          50: '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          300: '#6EE7B7',
          400: '#34D399',
          500: '#10B981', // Main success
          600: '#059669',
          700: '#047857',
          800: '#065F46',
          900: '#064E3B',
        },
        warning: {
          DEFAULT: '#F59E0B',
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B', // Main warning
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
          900: '#78350F',
        },
        error: {
          DEFAULT: '#EF4444',
          50: '#FEF2F2',
          100: '#FEE2E2',
          200: '#FECACA',
          300: '#FCA5A5',
          400: '#F87171',
          500: '#EF4444', // Main error
          600: '#DC2626',
          700: '#B91C1C',
          800: '#991B1B',
          900: '#7F1D1D',
        },
      },
      fontFamily: {
        // Headings - Poppins
        heading: ['var(--font-poppins)', 'sans-serif'],
        // Body text - Inter
        body: ['var(--font-inter)', 'sans-serif'],
        sans: ['var(--font-inter)', 'sans-serif'], // Default
      },
      fontSize: {
        // Custom typography scale
        'display-1': ['4rem', { lineHeight: '1.2', fontWeight: '700' }], // 64px
        'display-2': ['3rem', { lineHeight: '1.2', fontWeight: '700' }], // 48px
        h1: ['2.5rem', { lineHeight: '1.2', fontWeight: '700' }], // 40px
        h2: ['2rem', { lineHeight: '1.3', fontWeight: '600' }], // 32px
        h3: ['1.5rem', { lineHeight: '1.4', fontWeight: '600' }], // 24px
        h4: ['1.25rem', { lineHeight: '1.4', fontWeight: '600' }], // 20px
        h5: ['1.125rem', { lineHeight: '1.5', fontWeight: '600' }], // 18px
        h6: ['1rem', { lineHeight: '1.5', fontWeight: '600' }], // 16px
      },
      spacing: {
        // 8-point grid system is already built into Tailwind
        // Adding some custom spacing values
        '18': '4.5rem', // 72px
        '128': '32rem', // 512px
        '144': '36rem', // 576px
      },
      borderRadius: {
        // Custom border radius
        '4xl': '2rem',
      },
      boxShadow: {
        // Custom shadows for depth
        'glow-primary': '0 0 20px rgba(99, 102, 241, 0.3)',
        'glow-secondary': '0 0 20px rgba(236, 72, 153, 0.3)',
        soft: '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
      },
      animation: {
        // Custom animations
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
