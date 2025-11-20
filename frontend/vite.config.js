import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    // ВОТ МАГИЯ: перенаправляем запросы /api на бэкенд
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4000', // Адрес твоего бэкенда
        changeOrigin: true,
        secure: false,
      }
    }
  }
})