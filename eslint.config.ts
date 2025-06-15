import { fixupConfigRules } from '@eslint/compat';
import type { FixupConfigArray } from '@eslint/compat';
import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import { flatConfigs as importXFlatConfig } from 'eslint-plugin-import-x';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import reactPlugin from 'eslint-plugin-react';
import { browser, es2020, node } from 'globals';
import { config, configs as tsConfigs, parser as tsParser } from 'typescript-eslint';

export default config(
  // Shared configs
  js.configs.recommended,
  ...tsConfigs.recommended,
  jsxA11y.flatConfigs.recommended,
  importXFlatConfig.recommended,
  importXFlatConfig.typescript,
  eslintPluginPrettierRecommended,
  ...fixupConfigRules(new FlatCompat().extends('plugin:react-hooks/recommended') as FixupConfigArray),
  {
    files: ['**/*.{ts,tsx}'],
    ...reactPlugin.configs.flat.recommended,
    ...reactPlugin.configs.flat['jsx-runtime'],
  },
  // Custom config
  {
    ignores: ['**/build/**', '**/dist/**', '**/node_modules/**', 'chrome-extension/manifest.js'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
        projectService: true,
      },
      globals: {
        ...browser,
        ...es2020,
        ...node,
        chrome: 'readonly',
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'prefer-const': 'error',
      'no-var': 'error',
      'func-style': ['error', 'expression', { allowArrowFunctions: true }],
      'no-restricted-imports': [
        'error',
        {
          name: 'type-fest',
          message: 'Please import from `@extension/dev-utils` instead of `type-fest`.',
        },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/consistent-type-exports': 'error',
      'import-x/order': [
        'error',
        {
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
          pathGroups: [
            {
              pattern: '@extension/**',
              group: 'internal',
              position: 'before',
            },
            {
              pattern: '@src/**',
              group: 'internal',
              position: 'after',
            },
          ],
          pathGroupsExcludedImportTypes: ['type'],
        },
      ],
      'import-x/no-unresolved': 'off',
      'import-x/no-named-as-default': 'error',
      'import-x/no-named-as-default-member': 'error',
      'import-x/newline-after-import': 'error',
      'import-x/no-deprecated': 'error',
      'import-x/no-duplicates': ['error', { considerQueryString: true, 'prefer-inline': false }],
      'import-x/consistent-type-specifier-style': 'error',
      'import-x/exports-last': 'error',
      'import-x/first': 'error',
      /**
       * @todo
       * switch/remove bellow rules
       * once the team feels more comfortable with our codebase
       */
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
  },
  // Overrides Rules
  {
    files: ['**/packages/dev-utils/**/*.ts'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
);
