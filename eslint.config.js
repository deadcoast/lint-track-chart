import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
    },
    files: ['**/*.js', '**/*.mjs'],
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'off',
      'no-debugger': 'warn',
      'no-undef': 'error',
      'semi': ['error', 'always'],
      'quotes': ['warn', 'single'],
      'indent': ['warn', 2],
      'comma-dangle': ['warn', 'always-multiline'],
      'arrow-parens': ['warn', 'always'],
      'object-curly-spacing': ['warn', 'always'],
      'array-bracket-spacing': ['warn', 'never'],
      'space-before-function-paren': ['warn', {
        'anonymous': 'always',
        'named': 'never',
        'asyncArrow': 'always',
      }],
      'space-before-blocks': ['warn', 'always'],
      'keyword-spacing': ['warn', { 'before': true, 'after': true }],
      'eol-last': ['warn', 'always'],
      'no-multiple-empty-lines': ['warn', { 'max': 2, 'maxEOF': 1 }],
      'no-trailing-spaces': 'warn',
      'no-var': 'error',
      'prefer-const': 'warn',
      'prefer-arrow-callback': 'warn',
      'arrow-body-style': ['warn', 'as-needed'],
      'object-shorthand': 'warn',
      'array-callback-return': 'error',
      'no-return-await': 'warn',
      'require-await': 'warn',
      'no-async-promise-executor': 'error',
      'no-await-in-loop': 'warn',
      'no-promise-executor-return': 'error',
      'max-len': ['warn', {
        'code': 100,
        'ignoreComments': true,
        'ignoreStrings': true,
        'ignoreTemplateLiterals': true,
      }],
    },
  },
];
