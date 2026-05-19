import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import path from "path"

const API_TARGET = process.env.VITE_APP_API_URL ?? 'http://localhost:8080/Api';
const API_BASE = new URL(API_TARGET);

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss()
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      '/Api': {
        target: API_BASE.origin,
        changeOrigin: true,
        secure: false,
      },
      '/files': {
        target: API_BASE.origin,
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
