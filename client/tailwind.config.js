/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        void: '#000000',
        abyss: '#050510',
        obsidian: '#0a0a1a',
        carbon: '#0f0f23',
        'slate-dark': '#131328',
        'slate-mid': '#1a1a3e',
        'slate-light': '#252550',
        'neon-blue': '#00d4ff',
        'neon-purple': '#a855f7',
        'neon-violet': '#7c3aed',
        'neon-pink': '#ec4899',
        'neon-green': '#10b981',
        'neon-amber': '#f59e0b',
        'neon-red': '#ef4444',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
