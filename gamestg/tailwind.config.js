/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#00f2ff', // neon cyan
          dark: '#006e76',
          light: '#80f9ff',
        },
        secondary: {
          DEFAULT: '#ff00ea', // neon magenta
          dark: '#9c008f',
          light: '#ff80f5',
        },
        accent: {
          DEFAULT: '#ffe600', // neon yellow
          dark: '#c4b000',
          light: '#fff280',
        },
        background: {
          DEFAULT: '#0f0e17', // dark for cyberpunk theme
          light: '#f9f9f9',
        },
        surface: {
          DEFAULT: '#1a1926', // slightly lighter dark
          light: '#fffffe',
        },
        success: '#00ffa3', // neon green
        error: '#ff3864', // neon red
        warning: '#ff8e3c', // neon orange
      },
      fontFamily: {
        sans: ['Chakra Petch', 'sans-serif'],
        mono: ['Share Tech Mono', 'monospace'],
      },
      boxShadow: {
        'neon': '0 0 5px theme(colors.primary.DEFAULT), 0 0 20px theme(colors.primary.DEFAULT)',
        'neon-magenta': '0 0 5px theme(colors.secondary.DEFAULT), 0 0 20px theme(colors.secondary.DEFAULT)',
        'neon-yellow': '0 0 5px theme(colors.accent.DEFAULT), 0 0 20px theme(colors.accent.DEFAULT)',
      },
      animation: {
        'glitch': 'glitch 1s linear infinite',
        'scanline': 'scanline 6s linear infinite',
      },
      keyframes: {
        glitch: {
          '0%, 100%': { transform: 'translate(0)' },
          '20%': { transform: 'translate(-5px, 5px)' },
          '40%': { transform: 'translate(-5px, -5px)' },
          '60%': { transform: 'translate(5px, 5px)' },
          '80%': { transform: 'translate(5px, -5px)' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
      },
    },
  },
  plugins: [],
} 