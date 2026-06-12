/** @type {import('tailwindcss').Config} */
module.exports = {
  // Le thème suit le toggle de l'app (.dark sur <html>), jamais l'OS seul —
  // évite les mélanges clair/sombre (champ sombre dans un modal blanc, etc.)
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        tta: {
          DEFAULT: '#2D2A5E',
          light:   '#EBEBFF',
          mid:     '#4B47A0',
          accent:  '#7BCB8E',
        },
        nutri: {
          DEFAULT: '#22C55E',
          light:   '#F0FDF4',
          mid:     '#16A34A',
          dark:    '#14532D',
        },
        sport: {
          DEFAULT: '#7B7FD4',
          light:   '#F0F0FF',
          mid:     '#5C60C0',
          dark:    '#2D2A5E',
        },
        cream: {
          DEFAULT: '#FFFBF5',
          warm:    '#FFF8EE',
        },
        swim:   { DEFAULT: '#5DD4C0', light: '#E8FBF8', dark: '#0D7A6E' },
        gym:    { DEFAULT: '#A78BFA', light: '#F3EEFF', dark: '#4C1D95' },
        cardio: { DEFAULT: '#FDBA74', light: '#FFF7ED', dark: '#92400E' },
        boxing: { DEFAULT: '#F87171', light: '#FEF2F2', dark: '#991B1B' },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
}
