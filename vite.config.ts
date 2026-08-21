import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  server: {
    watch: {
      // The audit log lives under the project root and is written on every
      // quote. Without this, each write trips the dev watcher and triggers a
      // full reload — which unmounts the page immediately after the response
      // arrives, so the result never renders. Production is unaffected; this
      // is purely a dev-server interaction.
      ignored: ['**/data/**'],
    },
  },
  plugins: [devtools(), tailwindcss(), tanstackStart(), viteReact()],
})

export default config
