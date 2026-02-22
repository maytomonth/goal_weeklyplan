/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0b0b0f',
        surface: '#121319',
        'surface-2': '#1a1c24',
        border: '#2a2d36',
        text: '#f2f4f8',
        'text-muted': '#9aa1ae',
        accent: '#0a84ff',
        'accent-pressed': '#006fe6',
        danger: '#ff453a',
        success: '#30d158',
      },
      borderRadius: {
        card: '14px',
      },
    },
  },
  plugins: [],
};
