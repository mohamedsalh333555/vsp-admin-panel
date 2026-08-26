/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        vsp: {
          bg: '#09090B',
          surface: '#121215',
          card: '#18181B',
          border: '#27272A',
          accent: '#CCFF00',
          accentHover: '#b8e600',
          accentSoft: 'rgba(204, 255, 0, 0.1)',
          textPrimary: '#FAFAFA',
          textSecondary: '#A1A1AA',
          danger: '#EF4444',
          warning: '#F59E0B',
          success: '#10B981',
        }
      },
      fontFamily: {
        sans: ['Tajawal', 'Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
