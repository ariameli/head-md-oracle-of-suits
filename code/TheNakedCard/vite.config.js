import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  build: {
    rollupOptions: {
      input: {
        launcher: "src/launcher/index.html",
        crossbow: "src/games/crossbow/index.html",
        carpioche: "src/games/carpioche/index.html",
        fingerpaint: "src/games/fingerpaint/index.html",
        coin: "src/games/coin/index.html",
      },
    },
  },
  server: {
    open: "/src/launcher/index.html",
  },
});
