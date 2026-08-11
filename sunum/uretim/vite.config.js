import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/* Sadece sunum ekran görüntüleri için — gerçek supabaseClient yerine
 * sahte istemci yüklenir, sayfa bileşenleri hiç değişmeden çalışır. */
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: /^.*\/lib\/supabaseClient$/,
        replacement: fileURLToPath(new URL('./mock-supabase.js', import.meta.url)),
      },
    ],
  },
})
