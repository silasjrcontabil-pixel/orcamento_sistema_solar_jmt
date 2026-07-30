/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#EFA809',
          hover: '#B57725',
          50: '#fdf3d9',
          100: '#fbe8b3',
          200: '#f7d266',
          300: '#f3bc1a',
          400: '#EFA809',
          500: '#d19608',
          600: '#B57725',
          700: '#8a5a1c',
          800: '#5f3d13',
          900: '#33200a',
        },
        background: {
          DEFAULT: '#0a0a0a',
          soft: '#111113',
        },
        surface: '#18181b',
        secondary: '#1c1c1f',
        border: {
          DEFAULT: '#2a2a2e',
          light: '#38383e',
        },
        foreground: '#f5f5f4',
        'muted-foreground': '#9a9a9f',
        success: '#2fbf71',
        warning: '#f0b429',
        danger: '#e5484d',
        info: '#3b82f6',
      },
      fontFamily: {
        display: ['"Montserrat"', '"Poppins"', 'sans-serif'],
        body: ['"Inter"', '"Poppins"', 'sans-serif'],
      },
      boxShadow: {
        'gold-sm': '0 1px 0 0 rgba(239, 168, 9, 0.4)',
        card: '0 4px 20px -4px rgba(0,0,0,0.5)',
      },
      borderRadius: {
        lg: '0.75rem',
      },
    },
  },
  plugins: [],
}
