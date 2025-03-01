module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    parserOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      ecmaFeatures: {
        jsx: true,
      },
      project: './tsconfig.json',
    },
    plugins: ['@typescript-eslint', 'prettier', 'import'],
    extends: [
      'eslint:recommended',
      'plugin:@typescript-eslint/recommended',
      'plugin:@typescript-eslint/recommended-requiring-type-checking',
      'plugin:prettier/recommended',
      'plugin:import/recommended',
      'plugin:import/typescript',
    ],
    env: {
      browser: true,
      node: true,
      es6: true,
    },
    rules: {
      // TypeScript specific rules
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-empty-function': 'warn',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      
      // General ESLint rules
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      'prefer-const': 'error',
      'no-var': 'error',
      'eqeqeq': ['error', 'always'],
      
      // Import rules
      'import/no-unresolved': 'error',
      'import/order': [
        'error',
        {
          'groups': ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always',
          'alphabetize': { 'order': 'asc', 'caseInsensitive': true }
        }
      ],
      
      // Prettier integration
      'prettier/prettier': 'error',
    },
    settings: {
      'import/resolver': {
        'typescript': {
          'alwaysTryTypes': true,
        }
      }
    },
    ignorePatterns: [
      'node_modules',
      'dist',
      'build',
      '*.json',
      '*.html',
      '*.css',
      '*.scss',
      '*.md',
      '**/*.js', // Ignore JavaScript files
      '!.eslintrc.js', // But don't ignore this file
    ],
  };