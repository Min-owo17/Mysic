import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        // Docker 환경에서는 backend 서비스 이름 사용, 로컬에서는 localhost 사용
        // VITE_PROXY_TARGET 환경 변수로 오버라이드 가능 (예: VITE_PROXY_TARGET=http://backend:8000)
        target: process.env.VITE_PROXY_TARGET || 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        // WebSocket 지원 (필요한 경우)
        ws: true,
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  }
})

