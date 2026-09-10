import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'node:fs'

function readDevProxyTarget() {
  try {
    const config = JSON.parse(readFileSync(new URL('./public/app-config.json', import.meta.url), 'utf-8')) as { devProxyTarget?: string }
    return config.devProxyTarget || 'http://localhost:8099'
  } catch {
    return 'http://localhost:8099'
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/api': readDevProxyTarget(),
    },
  },
})
