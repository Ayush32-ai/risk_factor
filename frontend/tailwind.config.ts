import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    screens: {
      'xxs': '320px', // Very small phones
      'xs': '475px',  // Small phones in landscape
      'sm': '640px',  // Large phones / small tablets
      'md': '768px',  // Tablets
      'lg': '1024px', // Laptops
      'xl': '1280px', // Desktops
      '2xl': '1536px', // Large desktops
    },
    extend: {
      colors: {
        sentinel: {
          bg: '#f8fafc',
          surface: '#ffffff',
          border: '#e2e8f0',
          accent: '#2563eb',
          danger: '#dc2626',
          warning: '#d97706',
          success: '#059669',
          muted: '#475569',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(59, 130, 246, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.4)' },
        },
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      maxWidth: {
        '8xl': '88rem',
      },
      zIndex: {
        '60': '60',
        '70': '70',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
