/// <reference types="vitest" />
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { VitePWA } from "vite-plugin-pwa"

// https://vite.dev/config/
const config = {
  plugins: [
    react(),
    // LR-5 / D-4: installable app + precached shell so the app loads with no
    // connection. API responses are never cached (no offline reads); writes
    // made offline go through the IndexedDB queues instead.
    VitePWA({
      // Ask before switching to a newly deployed version (see UpdatePrompt), rather than switching silently
      registerType: "prompt",
      includeAssets: ["favicon-16.png", "favicon-32.png", "favicon-48.png", "apple-touch-icon.png"],
      manifest: {
        name: "StitchFyn", // matches BRAND_NAME in src/config/brand.ts
        short_name: "StitchFyn",
        description: "Production tracking for tailoring workshops",
        theme_color: "#1e5c3a",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/logo-icon.png", sizes: "512x512", type: "image/png" },
          { src: "/logo-icon.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,woff2}"],
        // The single app bundle is ~1.4 MB (see launch-readiness §5).
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: "/index.html",
      },
    }),
  ],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
  },
}

export default defineConfig(config as any)
