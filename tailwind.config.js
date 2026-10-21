import colors from 'tailwindcss/colors'

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      // Cor principal da NT Vendas: as classes "blue-*" usadas no app saem vermelhas (mesma paleta do Portal)
      colors: { blue: colors.red },
    },
  },
  plugins: [],
}
