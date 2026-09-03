/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.tsx',
    './index.ts',
    './components/**/*.{js,jsx,ts,tsx}',
    './screens/**/*.{js,jsx,ts,tsx}',
    './context/**/*.{js,jsx,ts,tsx}',
    './lib/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        // Material-flavoured brand ramp (high contrast)
        brand: {
          50: '#E8F0FE',
          100: '#D2E3FC',
          200: '#AECBFA',
          300: '#8AB4F8',
          400: '#669DF6',
          500: '#4285F4',
          600: '#1A73E8',
          700: '#0B57D0',
          800: '#174EA6',
          900: '#123A85',
        },
        ink: {
          900: '#0F172A',
          700: '#334155',
          500: '#64748B',
          300: '#94A3B8',
          100: '#CBD5E1',
        },
        canvas: '#F1F5F9',
        surface: '#FFFFFF',
        stable: '#137333',
        stablesoft: '#E6F4EA',
        watch: '#B26A00',
        watchsoft: '#FEF7E0',
        risk: '#C5221F',
        risksoft: '#FCE8E6',
      },
      fontFamily: {
        sans: undefined,
      },
    },
  },
  plugins: [],
};
