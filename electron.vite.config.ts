import { copyFileSync, mkdirSync } from 'fs'
import { dirname, resolve } from 'path'
import { defineConfig } from 'electron-vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const nvsPartitionGenSrc = resolve('src/shared/vendor/nvs_partition_gen.js')

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
          target: 'https://ai-flow.m5stack.com/api/v1',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '')
        },
        '/ws/realtime': {
          target: 'wss://ai-flow.m5stack.com',
          ws: true,
          changeOrigin: true
        }
      }
    },
    plugins: [react(), tailwindcss()],
    optimizeDeps: {
      include: [
        'monaco-editor/esm/vs/editor/editor.worker',
        'monaco-editor/esm/vs/language/typescript/ts.worker'
      ]
    }
  }
})
