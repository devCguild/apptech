import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages 주소가 https://devcguild.github.io/apptech/ 라서 base 가 레포 이름
export default defineConfig({
  plugins: [react()],
  base: "/apptech/",
});
