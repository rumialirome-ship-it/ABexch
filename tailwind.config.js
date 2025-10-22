/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Nunito', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
      },
      colors: {
        'bg-primary': '#0A0A0A', // Deep Black
        'bg-secondary': '#1C1C1E', // Graphite Gray
        'accent-cyan': '#33FFFF',
        'accent-blue': '#007BFF',
        'accent-violet': '#9F50FF',
        'accent-orange': '#FFBF00',
        'accent-yellow': '#FFD700',
        'danger': '#FF4757', // Fusion Red
        'text-primary': '#F0F0F5', // Slightly off-white
        'text-secondary': '#8A949E', // Muted gray
        'success': '#32D74B', // Vibrant Green
        'warning': '#FFD60A', // Vibrant Yellow
        'border-color': 'rgba(138, 148, 158, 0.2)', // Subtle Muted Gray
        'border-highlight': 'rgba(159, 80, 255, 0.5)', // Violet
      },
      boxShadow: {
        'glow-accent': '0 0 25px rgba(159, 80, 255, 0.5)', // Electric Violet Glow
        'glow-danger': '0 0 20px rgba(255, 71, 87, 0.7)',
        'glow-success': '0 0 20px rgba(50, 215, 75, 0.7)',
        'glow-hard': '0 0 25px rgba(159, 80, 255, 0.45)',
        'glow-inset-accent': 'inset 0 0 15px rgba(159, 80, 255, 0.15)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'fade-in-down': 'fadeInDown 0.5s ease-in-out',
        'fade-in-up': 'fadeInUp 0.5s ease-in-out',
        'highlight': 'highlight 2.5s ease-in-out',
        'pulse-glow': 'pulseGlow 2.5s ease-in-out infinite',
        'pulse-glow-success': 'pulseGlowSuccess 2.5s ease-in-out',
        'pulse-glow-danger': 'pulseGlowDanger 2.5s ease-in-out',
        'background-pan': 'backgroundPan 15s linear infinite',
        'aurora': 'aurora 20s ease-in-out infinite',
        'flicker': 'flicker 2.5s ease-in-out infinite',
      },
      keyframes: {
        'fadeIn': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fadeInDown': {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fadeInUp': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'highlight': {
          '0%, 100%': { backgroundColor: 'transparent' },
          '50%': { backgroundColor: 'rgba(159, 80, 255, 0.1)' },
        },
        'pulseGlow': {
          '0%, 100%': { boxShadow: '0 0 15px rgba(159, 80, 255, 0.35)', filter: 'brightness(1)' },
          '50%': { boxShadow: '0 0 25px rgba(159, 80, 255, 0.55)', filter: 'brightness(1.1)' },
        },
        'pulseGlowSuccess': {
            '0%, 100%': { boxShadow: 'none', filter: 'brightness(1)' },
            '50%': { boxShadow: '0 0 20px rgba(50, 215, 75, 0.7)', filter: 'brightness(1.2)' },
        },
        'pulseGlowDanger': {
            '0%, 100%': { boxShadow: 'none', filter: 'brightness(1)' },
            '50%': { boxShadow: '0 0 20px rgba(255, 71, 87, 0.7)', filter: 'brightness(1.2)' },
        },
        'backgroundPan': {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '100% 50%' },
        },
        'aurora': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        'flicker': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.9' },
        },
         'scanningGlow': {
          '0%': { backgroundPosition: '-200% -200%' },
          '100%': { backgroundPosition: '200% 200%' },
        },
      }
    },
  },
  plugins: [],
};
