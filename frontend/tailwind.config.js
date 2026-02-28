/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        refinery: {
          navy: '#1a2332',
          blue: '#2563eb',
          'light-blue': '#60a5fa',
          slate: '#475569',
          gold: '#f59e0b',
          green: '#10b981',
          red: '#ef4444',
          bg: '#f8fafc',
        }
      },
      fontFamily: {
        display: ['Playfair Display', 'serif'],
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
