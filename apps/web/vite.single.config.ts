import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { buildDefine } from "./buildInfo";
import { viteSingleFile } from "vite-plugin-singlefile";

// 모든 JS/CSS를 index.html 한 파일에 인라인 (claude.ai 아티팩트 게시용)
export default defineConfig({
  base: "./",
  define: buildDefine(),
  plugins: [react(), viteSingleFile()],
  build: { outDir: "dist-single", emptyOutDir: true },
});
