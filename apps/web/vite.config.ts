import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

// 정적 호스팅용 멀티 페이지 빌드: 게임(index.html) + 주사위 데모(dice.html)
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    rollupOptions: { input: { main: resolve(__dirname, "index.html"), dice: resolve(__dirname, "dice.html"), art: resolve(__dirname, "art.html") } },
  },
});
