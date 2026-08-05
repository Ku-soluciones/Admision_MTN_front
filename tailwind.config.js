/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'azul-monte-tabor': '#1e3a8a',
        'dorado-nazaret': '#f59e0b',
        'blanco-pureza': '#ffffff',
        'gris-piedra': '#6b7280',
        'verde-esperanza': '#059669',
        'rojo-sagrado': '#dc2626',
      },
      fontFamily: {
        sans: ['Montserrat', 'sans-serif'],
        serif: ['Lato', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
