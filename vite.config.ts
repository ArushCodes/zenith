import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import path from "node:path";

export default defineConfig(({ mode }) => {
  const serverEnv = loadEnv(mode, process.cwd(), "");
  for (const key of [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USER",
    "SMTP_PASS",
    "SMTP_FROM",
    "RESEND_API_KEY",
    "EMAIL_FROM",
    "CRON_SECRET",
    "CRON_SECRET_PREVIOUS",
    "EMAIL_INTAKE_SECRET",
    "AI_GATEWAY_URL",
    "AI_GATEWAY_API_KEY",
    "GEMINI_API_KEY",
  ]) {
    if (!process.env[key] && serverEnv[key]) process.env[key] = serverEnv[key];
  }
  return {
    server: { watch: { ignored: ["**/.vercel/**", "**/.output/**", "**/tmp/**"] } },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom", "@tanstack/react-query", "@tanstack/query-core"],
    },
    plugins: [
      tsconfigPaths(),
      tailwindcss(),
      tanstackStart({
        server: { entry: "server" },
      }),
      react(),
      nitro({
        preset: process.env["NITRO_PRESET"] || "vercel",
      }),
    ],
  };
});
