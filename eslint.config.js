//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'

export default [
  ...tanstackConfig,
  {
    rules: {
      'import/no-cycle': 'off',
      'import/order': 'off',
      'sort-imports': 'off',
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/require-await': 'off',
      'pnpm/json-enforce-catalog': 'off',
    },
  },
  {
    ignores: [
      'eslint.config.js',
      'prettier.config.js',
      // Build artifacts. The Vercel preset writes bundled JS under .vercel/output,
      // which is outside the tsconfig project and fails the type-aware parser.
      '.vercel/**',
      '.nitro/**',
      'dist/**',
      '.output/**',
      'src/routeTree.gen.ts',
    ],
  },
]
