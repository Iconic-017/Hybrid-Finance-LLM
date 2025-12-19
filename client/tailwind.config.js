module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5fbff',
          DEFAULT: '#0ea5e9',
          600: '#0284c7'
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui']
      }
    }
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: ["light"]
  }
};
