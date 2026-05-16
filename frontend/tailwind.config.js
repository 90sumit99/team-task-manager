/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Linear-inspired palette
        accent: {
          DEFAULT: '#5e6ad2',
          hover:   '#4f5bbf',
          light:   '#5e6ad220',
          subtle:  '#5e6ad210',
        },
        // Dark mode surfaces
        surface: {
          0:  '#0f0f0f',
          1:  '#141414',
          2:  '#1a1a1a',
          3:  '#212121',
          4:  '#2a2a2a',
          border: '#2d2d2d',
        },
        // Light mode surfaces
        light: {
          0:  '#ffffff',
          1:  '#f8f9fa',
          2:  '#f1f3f5',
          3:  '#e9ecef',
          border: '#dee2e6',
        },
        // Text
        t: {
          primary:   '#e2e2e2',
          secondary: '#999999',
          muted:     '#666666',
          inverse:   '#1a1a1a',
        },
        // Status colors
        todo:     { bg: '#2a2a2a', text: '#999999', border: '#3a3a3a' },
        progress: { bg: '#1a2a4a', text: '#5b8def', border: '#2a3a6a' },
        done:     { bg: '#0f2a1a', text: '#3dba6f', border: '#1a4a2a' },
        // Priority
        high:   '#ef4444',
        medium: '#f59e0b',
        low:    '#5e6ad2',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        'label': ['11px', { letterSpacing: '0.06em', fontWeight: '500' }],
      },
      animation: {
        'fade-in':    'fadeIn 0.2s ease-out',
        'slide-up':   'slideUp 0.25s ease-out',
        'slide-in-l': 'slideInL 0.25s ease-out',
        'spin-slow':  'spin 1.5s linear infinite',
      },
      keyframes: {
        fadeIn:   { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp:  { '0%': { transform: 'translateY(12px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        slideInL: { '0%': { transform: 'translateX(-16px)', opacity: '0' }, '100%': { transform: 'translateX(0)', opacity: '1' } },
      },
    },
  },
  plugins: [],
}
