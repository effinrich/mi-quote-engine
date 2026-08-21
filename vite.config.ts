import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { nitroV2Plugin } from '@tanstack/nitro-v2-vite-plugin'

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
  plugins: [
    devtools(),
    tailwindcss(),
    tanstackStart(),
    // Vercel is not one of the Start CLI's built-in deployment adapters, so the
    // server build goes through Nitro's vercel preset. Without this the build
    // emits a plain Node bundle that Vercel does not know how to run — it
    // deploys successfully and then 404s on every route.
    nitroV2Plugin({ preset: 'vercel' }),
    viteReact(),
  ],
})

export default config
