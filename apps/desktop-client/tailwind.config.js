/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pulse: {
          primary: '#2563eb', // Vibrant Blue
          secondary: '#f97316', // Catchy Orange
          accent: '#06b6d4', // Cyan
          bg: '#f8fafc', // Light Gray
          bgDark: '#0f172a', // Deep Slate
          surface: '#ffffff',
          border: '#e2e8f0',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
