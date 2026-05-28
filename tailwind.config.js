/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // TTA brand — couleur principale gemelle (bleu nuit + vert émeraude)
        tta: {
          DEFAULT: '#1A1F3C',
          light:   '#E8EAF6',
          mid:     '#3D4A8F',
          accent:  '#00C896', // accent vert émeraude (le "twin" vivant)
        },
        // Module Nutrition (vert)
        nutri: {
          DEFAULT: '#16A34A',
          light:   '#DCFCE7',
          dark:    '#14532D',
        },
        // Module Sport — disciplines
        swim:    { DEFAULT: '#5DCAA5', light: '#E1F5EE', dark: '#085041' },
        gym:     { DEFAULT: '#7F77DD', light: '#EEEDFE', dark: '#3C3489' },
        cardio:  { DEFAULT: '#EF9F27', light: '#FAEEDA', dark: '#633806' },
        boxing:  { DEFAULT: '#D85A30', light: '#FAECE7', dark: '#712B13' },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
}
