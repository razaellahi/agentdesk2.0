/// <reference types="vitest/config" />
import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";

// Runtime settings (backend URLs, tenancy, flags) come from public/config.json at
// startup, never from build-time env. Only dev-server concerns live here.
export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const basePath = env.BASE_PATH || "/agent-desk/";
  // Production assets are relative and resolved against <base href>, which the
  // container rewrites from BASE_PATH at start, so one image serves any path.
  const base = command === "build" ? "./" : basePath;
  const proxyTarget = env.VITE_PROXY_TARGET;

  return {
    base,
    plugins: [
      react(),
      tailwindcss(),
      {
        name: "agent-desk-base-href",
        transformIndexHtml: (html) => html.replace("<head>", `<head>\n    <base href="${basePath}" />`),
      },
    ],
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    server: {
      port: 4200,
      // Proxy service paths to a real environment so config.json can use the dev origin.
      proxy: proxyTarget
        ? Object.fromEntries(
            [
              "/agent-manager",
              "/file-engine",
              "/ccm",
              "/cim-customer",
              "/conversation-manager",
              "/routing-engine",
              "/realtime-reports",
              "/unified-admin",
              "/team-announcement",
              "/secure-link",
              "/cx-tenant",
              "/qm-backend",
              "/llm",
              "/vrs",
              "/stream",
              "/grafana",
            ].map((path) => [path, { target: proxyTarget, changeOrigin: true, secure: false, ws: true }]),
          )
        : undefined,
    },
    build: {
      target: "es2022",
      sourcemap: true,
      chunkSizeWarningLimit: 600,
      rolldownOptions: {
        output: {
          // Long-lived vendor chunks so app deploys don't bust framework caches.
          // Only eagerly used libraries are grouped; feature-only libraries stay lazy.
          codeSplitting: {
            groups: [
              { name: "react", test: /node_modules[\\/](react|react-dom|scheduler|react-router)[\\/]/ },
              {
                name: "data",
                test: /node_modules[\\/](@tanstack|zustand|immer|ky|zod|react-hook-form|@hookform)[\\/]/,
              },
              { name: "i18n", test: /node_modules[\\/](i18next|react-i18next)[\\/]/ },
              {
                name: "ui",
                test: /node_modules[\\/](@radix-ui|radix-ui|@floating-ui|lucide-react|sonner|cmdk|tailwind-merge|clsx|class-variance-authority)[\\/]/,
              },
            ],
          },
        },
      },
    },
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
      include: ["src/**/*.test.{ts,tsx}"],
      css: false,
      coverage: {
        provider: "v8",
        reporter: ["text", "lcov", "cobertura"],
        include: ["src/**/*.{ts,tsx}"],
        exclude: ["src/**/*.test.{ts,tsx}", "src/test/**", "src/components/ui/**", "src/main.tsx"],
      },
    },
  };
});
