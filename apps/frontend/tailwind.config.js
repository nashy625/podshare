/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#101828",
        mint: "#86efac",
        ocean: "#1d4ed8",
      },
    },
  },
  plugins: [],
};
