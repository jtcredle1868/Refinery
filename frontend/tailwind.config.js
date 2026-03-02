/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: '#171321',
        parchment: '#f5efe7',
        plum: '#5f2d82',
        ember: '#ff784f',
      },
      fontFamily: {
        serif: ['"IBM Plex Serif"', 'serif'],
        display: ['"Playfair Display"', 'serif'],
        sans: ['"IBM Plex Sans"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
