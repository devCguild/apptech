import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 배포 주소의 앞부분. GitHub Pages 는 /apptech/ (deploy.yml 이 BASE_PATH 로 넘김), Vercel·로컬은 /
export default defineConfig({
  plugins: [react()],
  base: process.env.BASE_PATH ?? "/",
});
