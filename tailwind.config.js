/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        brand: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        ink: {
          // Neutral surface tokens — used heavily in dark mode
          50:  '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          850: '#172033', // custom mid between 800/900
          900: '#0f172a',
          950: '#020617',
        },
      },
      boxShadow: {
        // Color-tinted shadows look way more premium than gray
        'soft':       '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 2px 8px -2px rgb(15 23 42 / 0.04)',
        'soft-md':    '0 4px 12px -2px rgb(15 23 42 / 0.08), 0 2px 4px -2px rgb(15 23 42 / 0.04)',
        'soft-lg':    '0 12px 32px -8px rgb(15 23 42 / 0.12), 0 4px 12px -4px rgb(15 23 42 / 0.06)',
        'brand-glow': '0 8px 24px -8px rgb(99 102 241 / 0.45)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: 0, transform: 'translateY(4px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: 0.3 },
          '50%': { opacity: 1 },
        },
        'bubble-in': {
          '0%': { opacity: 0, transform: 'translateY(6px) scale(0.97)' },
          '100%': { opacity: 1, transform: 'translateY(0) scale(1)' },
        },
        'pop': {
          '0%': { transform: 'scale(0.6)' },
          '60%': { transform: 'scale(1.15)' },
          '100%': { transform: 'scale(1)' },
        },
        'spring-in': {
          '0%': { opacity: 0, transform: 'translateY(12px) scale(0.96)' },
          '60%': { opacity: 1, transform: 'translateY(-2px) scale(1.01)' },
          '100%': { opacity: 1, transform: 'translateY(0) scale(1)' },
        },
        'sheet-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'shimmer': {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'float-y': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-6px)' },
        },
        'heart-float': {
          '0%':   { opacity: 0, transform: 'translate(-50%, 0) scale(0.4)' },
          '20%':  { opacity: 1, transform: 'translate(-50%, -10px) scale(1.2)' },
          '60%':  { opacity: 1, transform: 'translate(-50%, -60px) scale(1)' },
          '100%': { opacity: 0, transform: 'translate(-50%, -120px) scale(0.9)' },
        },
        'send-swoosh': {
          '0%':   { transform: 'translate(0, 0) rotate(0deg)', opacity: 1 },
          '40%':  { transform: 'translate(10px, -10px) rotate(15deg)', opacity: 0.4 },
          '50%':  { transform: 'translate(14px, -14px) rotate(20deg)', opacity: 0 },
          '50.1%':{ transform: 'translate(-6px, 6px) rotate(-12deg)', opacity: 0 },
          '100%': { transform: 'translate(0, 0) rotate(0deg)', opacity: 1 },
        },
        'ring-pulse': {
          '0%':   { transform: 'scale(1)',   opacity: 0.7 },
          '75%':  { transform: 'scale(2.2)', opacity: 0 },
          '100%': { transform: 'scale(2.2)', opacity: 0 },
        },
        'spin-soft': {
          '0%':   { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'fade-in':     'fade-in 150ms ease-out',
        'bubble-in':   'bubble-in 220ms cubic-bezier(0.34, 1.4, 0.64, 1)',
        'pulse-dot':   'pulse-dot 1.2s ease-in-out infinite',
        'pop':         'pop 320ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        'spring-in':   'spring-in 280ms cubic-bezier(0.34, 1.5, 0.64, 1)',
        'sheet-up':    'sheet-up 260ms cubic-bezier(0.34, 1.3, 0.64, 1)',
        'shimmer':     'shimmer 1.6s ease-in-out infinite',
        'float-y':     'float-y 3.2s ease-in-out infinite',
        'heart-float': 'heart-float 1100ms cubic-bezier(0.22, 0.61, 0.36, 1) forwards',
        'send-swoosh': 'send-swoosh 420ms ease-out',
        'ring-pulse':  'ring-pulse 2.2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'spin-soft':   'spin-soft 600ms cubic-bezier(0.34, 1.3, 0.64, 1)',
      },
    },
  },
  plugins: [],
};
