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
          navy: '#1A4FA0',
          'navy-light': '#234FA8',
          'navy-dark': '#1547A1',
          accent: '#1A4FA0',
          'accent-hover': '#1547A1',
          'accent-soft': '#E8F0FA',
        },
        brand: {
          DEFAULT: '#1A4FA0',
          accent: '#1A4FA0',
          light: '#F8FAFC',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#F8FAFC',
          border: '#E2E8F0',
          sidebar: '#1A4FA0',
        },
        ink: {
          DEFAULT: '#0F172A',
          secondary: '#475569',
          muted: '#94A3B8',
        },
        success: { DEFAULT: '#16A34A', light: '#F0FDF4', dark: '#15803D' },
        warning: { DEFAULT: '#F59E0B', light: '#FFFBEB', dark: '#D97706' },
        danger: { DEFAULT: '#DC2626', light: '#FEF2F2', dark: '#B91C1C' },
        site: { DEFAULT: '#1A4FA0', light: '#E8F0FA', dark: '#1547A1' },
        store: { DEFAULT: '#1A4FA0', light: '#E8F0FA', dark: '#1547A1' },
        pm: { DEFAULT: '#7C3AED', light: '#F5F3FF', dark: '#6D28D9' },
        executive: { DEFAULT: '#1A4FA0', light: '#E8F0FA', dark: '#1547A1' },
        coordinator: { DEFAULT: '#0D9488', light: '#F0FDFA', dark: '#0F766E' },
        chairman: { DEFAULT: '#1A4FA0', light: '#E8F0FA', dark: '#1547A1' },
      },
      borderRadius: {
        card: '16px',
        xl: '18px',
        '2xl': '20px',
        '3xl': '24px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 12px rgba(15, 23, 42, 0.06)',
        'card-hover': '0 4px 6px rgba(15, 23, 42, 0.04), 0 12px 32px rgba(15, 23, 42, 0.1)',
        sidebar: '4px 0 24px rgba(26, 79, 160, 0.15)',
        glow: '0 0 0 1px rgba(26, 79, 160, 0.12), 0 8px 24px rgba(26, 79, 160, 0.18)',
      },
      transitionDuration: {
        DEFAULT: '180ms',
      },
      maxWidth: {
        dashboard: '1600px',
      },
    },
  },
  plugins: [],
};
