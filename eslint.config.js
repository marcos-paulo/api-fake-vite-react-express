import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import react from 'eslint-plugin-react';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'root-endpoints'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.strict],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    settings: {
      react: { version: 'detect' },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      react: react,
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      // React Hooks
      ...reactHooks.configs.recommended.rules,

      // React Refresh
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // React
      'react/jsx-key': 'error',
      'react/no-array-index-key': 'warn',
      'react/self-closing-comp': 'error',
      'react/jsx-no-useless-fragment': ['warn', { allowExpressions: true }],
      'react/react-in-jsx-scope': 'off', // não necessário com o novo JSX transform

      // TypeScript
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // Imports
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',

      // Qualidade geral
      'no-console': ['warn', { allow: ['error', 'warn'] }],
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-alert': 'error',
    },
  },

  // ---------------------------------------------------------------------------
  // Servidor — arquivos Node.js (sem React, com globals de Node)
  // ---------------------------------------------------------------------------
  {
    files: ['src/server/**/*.ts', 'root-endpoints/**/*.ts', 'express-plugin.ts'],
    languageOptions: {
      globals: { ...globals.node },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Servidor loga por natureza — permitir console.log
      'no-console': 'off',
      // delete dinâmico é aceitável em estruturas de dados mutáveis do servidor
      '@typescript-eslint/no-dynamic-delete': 'off',
      // async sem await é um erro — indica que async foi adicionado por engano
      '@typescript-eslint/require-await': 'error',
    },
  },
);
