import { copyFileSync, mkdirSync, readFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { defineConfig } from 'electron-vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const nvsPartitionGenSrc = resolve('src/shared/vendor/nvs_partition_gen.js')
const appVersion = (
  JSON.parse(readFileSync(resolve('package.json'), 'utf-8')) as { version: string }
).version

/** Copy NVS generator beside main bundle so main process can require() it at runtime. */
function copyNvsPartitionGenPlugin(): Plugin {
  return {
    name: 'copy-nvs-partition-gen',
    closeBundle() {
      const dest = resolve('out/main/nvs_partition_gen.js')
      mkdirSync(dirname(dest), { recursive: true })
      copyFileSync(nvsPartitionGenSrc, dest)
    }
  }
}

export default defineConfig({
  main: {
    plugins: [copyNvsPartitionGenPlugin()]
  },
  preload: {},
  renderer: {
    envDir: resolve('env'),
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    server: {
      port: 5172,
      proxy: {
        '/api': {
          target: 'https://uiflow2.m5stack.com/m5stack/api/v1',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '')
        },
        '/burner': {
          target: 'https://burner.m5stack.com/api/v1',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/burner/, '')
        },
        '/ws/realtime': {
          target: 'wss://uiflow2.m5stack.com',
          ws: true,
          changeOrigin: true
        }
      }
    },
    plugins: [react(), tailwindcss()],
    define: {
      __APP_VERSION__: JSON.stringify(appVersion)
    },
    optimizeDeps: {
      include: [
        'monaco-editor/esm/vs/editor/editor.worker',
        'monaco-editor/esm/vs/language/typescript/ts.worker'
      ]
    }
  }
})
