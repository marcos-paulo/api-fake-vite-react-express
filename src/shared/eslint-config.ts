import simpleImportSort from 'eslint-plugin-simple-import-sort';
import tseslint from 'typescript-eslint';

/**
 * Fragmento de flat-config compartilhado com projetos que instalam o api-fake.
 * Contém só as regras de "boas práticas gerais" aplicadas neste repo (import de
 * tipos consistente, import-sort, etc) — nada React-específico. Quem consome
 * espalha este array dentro do próprio eslint.config.{js,mjs,ts}.
 */
export default tseslint.config({
  files: ['**/*.{ts,tsx}'],
  languageOptions: {
    parser: tseslint.parser,
  },
  plugins: {
    '@typescript-eslint': tseslint.plugin,
    'simple-import-sort': simpleImportSort,
  },
  rules: {
    '@typescript-eslint/consistent-type-imports': [
      'error',
      { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
    ],
    '@typescript-eslint/no-import-type-side-effects': 'error',
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    '@typescript-eslint/no-non-null-assertion': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',

    'simple-import-sort/imports': 'error',
    'simple-import-sort/exports': 'error',

    'prefer-const': 'error',
    'no-var': 'error',
    eqeqeq: ['error', 'always', { null: 'ignore' }],
    'no-alert': 'error',
  },
});
