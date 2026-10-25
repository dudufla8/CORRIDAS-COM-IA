/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        taxi: {
          amber: '#FFB800',
          orange: '#FF8A00',
          dark: '#101726',
          surface: '#F4F6FC',
        },
      },
    },
  },
  plugins: [],
};
