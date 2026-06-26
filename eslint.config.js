import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts', 'tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    files: ['tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
    },
  },
  {
    // zod is a DEV-ONLY dep (scripts/gen-data.mjs validates data/*.json). The engine
    // consumes the generated *.gen.ts, never zod — banning it under src/ guarantees it
    // can't slip into the Vite browser bundle.
    files: ['src/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [{ name: 'zod', message: 'zod is dev-only (scripts/gen-data.mjs); the engine reads generated *.gen.ts.' }],
      }],
    },
  },
  {
    // Generated data modules — committed, validated by gen-data + the data-sync test;
    // exempt from lint style (still typechecked by tsc).
    ignores: ['dist/', 'node_modules/', 'src/**/*.gen.ts'],
  },
);
