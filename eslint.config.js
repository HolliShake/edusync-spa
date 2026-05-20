import js from '@eslint/js';
import eslintPluginImport from 'eslint-plugin-import';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import eslintPluginReact from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config([
  // 1. Global Ignores
  {
    ignores: ['dist/'],
  },

  // 2. Recommended Base Configs
  js.configs.recommended,
  ...tseslint.configs.recommended,
  jsxA11y.flatConfigs.recommended,
  reactRefresh.configs.vite,
  eslintPluginPrettierRecommended,

  // 3. Flat Config Compatibility Fix for eslint-plugin-import
  {
    files: ['**/*.{ts,tsx}'],
    ...eslintPluginImport.flatConfigs.recommended,
    languageOptions: {
      parser: tseslint.parser,
    },
    settings: {
      'import/resolver': {
        typescript: true,
        node: true,
      },
    },
  },

  // 4. Custom Project Rules & Extensions
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-hooks': reactHooks, // ← manually register as flat config object
      'simple-import-sort': simpleImportSort,
      react: eslintPluginReact,
    },
    rules: {
      // React Hooks — manually pull in only the two stable rules
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // Code Formatting & Styling
      'prettier/prettier': 'warn',
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'no-restricted-imports': ['error', { patterns: ['../*', './../*', '../../*'] }],

      // Development Quality Rules
      '@typescript-eslint/no-unused-vars': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // Fast Refresh Configuration
      'react-refresh/only-export-components': 'off',

      // State Lifecycles inside Effects
      'react/no-did-mount-set-state': 'off',
      'react/no-did-update-set-state': 'off',
    },
  },
]);
