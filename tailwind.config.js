/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        bekem: {
          navy: '#173F7A',
          'navy-light': '#1D4E9E',
          'navy-dark': '#123566',
          accent: '#1D4E9E',
          'accent-hover': '#184489',
          'accent-soft': '#E8EEF6',
        },
        gold: {
          DEFAULT: '#B8860B',
          light: '#FEF9E7',
          dark: '#92700C',
        },
        brand: {
          DEFAULT: '#1D4E9E',
          accent: '#1D4E9E',
          light: '#FFFFFF',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#F9FAFB',
          border: '#E2E8F0',
          sidebar: '#173F7A',
        },
        ink: {
          DEFAULT: '#0F172A',
          secondary: '#475569',
          muted: '#94A3B8',
        },
        success: { DEFAULT: '#16A34A', light: '#F0FDF4', dark: '#15803D' },
        warning: { DEFAULT: '#EA580C', light: '#FFF7ED', dark: '#C2410C' },
        danger: { DEFAULT: '#DC2626', light: '#FEF2F2', dark: '#B91C1C' },
        review: { DEFAULT: '#1D4E9E', light: '#E8EEF6', dark: '#184489' },
        site: { DEFAULT: '#1D4E9E', light: '#E8EEF6', dark: '#184489' },
        store: { DEFAULT: '#1D4E9E', light: '#E8EEF6', dark: '#184489' },
        pm: { DEFAULT: '#1D4E9E', light: '#E8EEF6', dark: '#184489' },
        executive: { DEFAULT: '#1D4E9E', light: '#E8EEF6', dark: '#184489' },
        coordinator: { DEFAULT: '#1D4E9E', light: '#E8EEF6', dark: '#184489' },
        chairman: { DEFAULT: '#B8860B', light: '#FEF9E7', dark: '#92700C' },
      },
      borderRadius: {
        card: '10px',
        xl: '12px',
        '2xl': '14px',
        '3xl': '16px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 23, 42, 0.04)',
        'card-hover': '0 1px 3px rgba(15, 23, 42, 0.06)',
        sidebar: 'none',
        glow: 'none',
      },
      transitionDuration: {
        DEFAULT: '180ms',
      },
      maxWidth: {
        dashboard: '1600px',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-down': {
          from: { opacity: '0', transform: 'translateY(-6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 200ms ease-out',
        'slide-up': 'slide-up 220ms ease-out',
        'slide-down': 'slide-down 220ms ease-out',
      },
    },
  },
  plugins: [],
};
