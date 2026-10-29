import fs from "node:fs";
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

/** Static hosts have no server rewrite. GitHub Pages serves 404.html for unknown paths. */
function spaFallback(): Plugin {
  return {
    name: "spa-fallback",
    apply: "build",
    closeBundle() {
      const dist = path.resolve("dist");
      const indexPath = path.join(dist, "index.html");
      if (!fs.existsSync(indexPath)) return;
      fs.copyFileSync(indexPath, path.join(dist, "404.html"));
      fs.writeFileSync(path.join(dist, ".nojekyll"), "");
    },
  };
}

export default defineConfig({
  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
      quoteStyle: "single",
      semicolons: false,
    }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
    spaFallback(),
  ],
  optimizeDeps: { include: ["lucide-react", "zod"] },
  server: {
    allowedHosts: [".trycloudflare.com", ".credexfin.com"],
  },
});
