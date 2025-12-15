import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import { resolve } from 'path'

export default defineConfig({
  plugins: [solid()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        setup: resolve(__dirname, 'setup.html')
      }
    }
  }
})
