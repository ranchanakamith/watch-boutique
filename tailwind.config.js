/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // <-- ADD THIS LINE
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        theme: {
          bg: '#050505',    
          card: '#0a0a0a',  
          gold: '#C5A059',  
          muted: '#888888', 
        }
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'serif'], 
        sans: ['Montserrat', 'sans-serif'],     
      }
    },
  },
  plugins: [],
}