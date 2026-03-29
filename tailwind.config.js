/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/**/*.{js,jsx,html}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: 'var(--brand-50, #f0f4ff)',
          100: 'var(--brand-100, #dbe4ff)',
          200: 'var(--brand-200, #bac8ff)',
          300: 'var(--brand-300, #91a7ff)',
          400: 'var(--brand-400, #748ffc)',
          500: 'var(--brand-500, #5c7cfa)',
          600: 'var(--brand-600, #4c6ef5)',
          700: 'var(--brand-700, #4263eb)',
          800: 'var(--brand-800, #3b5bdb)',
          900: 'var(--brand-900, #364fc7)',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
