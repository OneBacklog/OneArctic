import { createConfigForNuxt } from '@nuxt/eslint-config/flat'

export default createConfigForNuxt(
  {
    features: {
      stylistic: false,
    },
  },
  {
    ignores: [
      '.output/**',
      '.nuxt/**',
      '.nitro/**',
      '.data/**',
      '.cache/**',
      'dist/**',
      'node_modules/**',
      'data/**',
      'files/**',
    ],
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-dynamic-delete': 'off',
      'no-empty': 'off',
      'no-useless-escape': 'off',
    },
  }
)
