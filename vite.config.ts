import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "public",
      filename: "sw.js",
      registerType: "autoUpdate",
      injectRegister: false,
      includeAssets: ["favicon.svg", "robots.txt"],
      manifest: {
        name: "Madrasa",
        short_name: "Madrasa",
        description: "School portal for Madrasatus Sahaba Li Tahfizul Qur'an.",
        theme_color: "#1E4830",
        background_color: "#FAF9F6",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ]
      },
})
  ],
  build: {
    minify: "esbuild",
    chunkSizeWarningLimit: 1500
  },
  server: { host: "0.0.0.0", port: 5173 }
});
