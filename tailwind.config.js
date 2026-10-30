/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef5ff',
          100: '#d9e8ff',
          200: '#bcd5ff',
          400: '#5b97ec',
          500: '#3d80e3',
          600: '#2a6fdb',
          700: '#1f58b5',
          800: '#1d4a91',
          900: '#1b3f77',
        },
      },
      keyframes: {
        fadeUp: { '0%': { opacity: 0, transform: 'translateY(8px)' }, '100%': { opacity: 1, transform: 'none' } },
        pop: { '0%': { transform: 'scale(.96)', opacity: 0 }, '100%': { transform: 'scale(1)', opacity: 1 } },
        slideUp: { '0%': { transform: 'translateY(100%)' }, '100%': { transform: 'translateY(0)' } },
      },
      animation: {
        fadeUp: 'fadeUp .35s ease both',
        pop: 'pop .2s ease both',
        slideUp: 'slideUp .25s ease both',
      },
    },
  },
  plugins: [],
}
