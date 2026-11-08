/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./dice.html", "./src/**/*.{ts,tsx}"],
  theme: {
    borderRadius: { none: "0", sm: "1px", DEFAULT: "2px", md: "2px", lg: "2px", xl: "2px", "2xl": "2px", full: "9999px" },
    extend: {
      colors: {
        soot: "#1a1512", panel: "#2b221b", panel2: "#3d3126", line: "#4a4439", line2: "#6e5b4b",
        ink: "#e3d8bd", muted: "#a99a7a", faint: "#7a6d59",
        gold: { DEFAULT: "#b8995a", dim: "#8b7355", hi: "#d4bd7e" },
        blight: "#566b3a", blood: "#b8473a", frost: "#93a889",
        parch: { DEFAULT: "#c2b280", lo: "#a8996a", ink: "#2a2118" }, rot: "#1c2b18", clot: "#590909",
      },
      fontFamily: {
        display: ['"IM Fell English SC"', '"Song Myung"', '"Nanum Myeongjo"', "serif"],
        body: ['"Gowun Batang"', '"Nanum Myeongjo"', "Batang", "serif"],
        ui: ['"IBM Plex Sans KR"', '"Apple SD Gothic Neo"', '"Malgun Gothic"', "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
