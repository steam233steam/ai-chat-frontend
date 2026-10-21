import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

export default defineConfig(({ mode }) => {
  // 注意：vite 配置里拿不到 import.meta.env，必须用 loadEnv 读取 .env 文件
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget = env.VITE_API_BASE_URL || 'http://localhost:8080'

  return {
    plugins: [
      vue(),
      vueDevTools(),
      AutoImport({
        resolvers: [ElementPlusResolver()],
      }),
      Components({
        resolvers: [ElementPlusResolver()],
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('/vue/') || id.includes('/vue-router/') || id.includes('@vue')) {
                return 'vue-vendor'
              }
              if (id.includes('/element-plus/') || id.includes('@element-plus')) {
                return 'element-plus'
              }
              if (id.includes('/marked/') || id.includes('/dompurify/') || id.includes('/purify/')) {
                return 'markdown'
              }
              if (id.includes('/axios/')) {
                return 'axios'
              }
            }
          },
        },
      },
    },
    server: {
      proxy: {
        '/api': {
          target: proxyTarget,
          secure: false,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
          configure: (proxy) => {
            // SSE 请求去掉 Accept-Encoding，防止后端压缩导致整个响应被缓冲
            proxy.on('proxyReq', (proxyReq, req) => {
              if (req.headers.accept && req.headers.accept.includes('text/event-stream')) {
                proxyReq.setHeader('Accept-Encoding', 'identity')
                proxyReq.setHeader('Cache-Control', 'no-cache')
              }
            })
          }
        }
      }
    }
  }
})
