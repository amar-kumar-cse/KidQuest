/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: {
          yellow: "#FFD700",
          lightBlue: "#87CEEB",
          darkBlue: "#000080"
        }
      }
    },
  },
  plugins: [],
}
