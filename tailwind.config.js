/** @type {import('tailwindcss').Config} */
export default {
  // darkMode: 'class' → toggle manual via classe no <html>
  // Adicionar 'dark' na tag html ativa todos os dark: prefixes
  darkMode: 'class',

  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],

  theme: {
    extend: {
      colors: {
        // Cores da PSR — usadas em ambos os temas
        brand: {
          50:  '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',  // ← cor principal PSR
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
      },

      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },

      // Animações para o PWA / formulários mobile
      animation: {
        'fade-in':    'fadeIn 0.2s ease-out',
        'slide-up':   'slideUp 0.25s ease-out',
        'slide-down': 'slideDown 0.25s ease-out',
        'spin-slow':  'spin 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%':   { opacity: '0', transform: 'translateY(-12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },

      // Altura mínima de toque — botões mobile (48px padrão Apple/Google)
      minHeight: {
        touch: '48px',
      },
      height: {
        touch: '48px',
      },
    },
  },

  plugins: [],
}