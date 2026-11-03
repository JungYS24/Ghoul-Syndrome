/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./dice.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        soot: "#14110e", panel: "#1d1915", panel2: "#262019", line: "#3b3229", line2: "#54473a",
        ink: "#ebe0cb", muted: "#a8987c", faint: "#7a6d59",
        gold: { DEFAULT: "#cfa752", dim: "#8c6f35", hi: "#ecc977" },
        blight: "#93a548", blood: "#b4513a", frost: "#8fb6c6",
      },
      fontFamily: {
        display: ['"Song Myung"', '"Nanum Myeongjo"', "serif"],
        body: ['"Gowun Batang"', '"Nanum Myeongjo"', "Batang", "serif"],
        ui: ['"IBM Plex Sans KR"', '"Apple SD Gothic Neo"', '"Malgun Gothic"', "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
