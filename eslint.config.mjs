import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

/**
 * Single flat config for the whole monorepo. ESLint resolves this by walking
 * up from each workspace, so `npm run lint` works from the root or any package.
 *
 * Deliberately not using `eslint-config-next`: it pins ESLint 8, and this repo
 * runs ESLint 10. The Next-specific rules it adds are far less valuable here
 * than the React hooks rules, which catch a real class of bug.
 */
export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/.next/**',
      '**/.vercel/**',
      '**/next-env.d.ts'
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx,mts,js,mjs}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node, ...globals.es2021 }
    }
  },
  {
    // Browser + React code.
    files: ['frontend/**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser }
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // These rules exist for the React Compiler, which this app does not run
      // (Next 14, no compiler plugin). They flag ordinary data-loading effects
      // and local render accumulators, which is noise without the compiler.
      // `rules-of-hooks` and `exhaustive-deps` — the rules that catch real
      // bugs — stay on.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/purity': 'off'
    }
  },
  {
    // Node dev scripts are CommonJS on purpose (run via `node scripts/...`).
    files: ['scripts/**/*.js', '*.config.js', '*.config.mjs'],
    languageOptions: {
      globals: { ...globals.node }
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off'
    }
  },
  {
    // Jest tests load modules lazily with `require()` inside
    // `jest.isolateModules`, which is the supported way to re-import a module
    // with a fresh module registry.
    files: [
      '**/*.spec.ts',
      '**/*.spec.tsx',
      '**/*.test.ts',
      '**/*.test.tsx',
      'backend/test/**/*.ts'
    ],
    rules: {
      '@typescript-eslint/no-require-imports': 'off'
    }
  },
  {
    files: ['**/*.{ts,tsx,mts,js,mjs}'],
    rules: {
      // The codebase is un-typed at its edges (API responses, `any`-shaped
      // fixtures); blanket `any` bans would force a rewrite, not a fix.
      '@typescript-eslint/no-explicit-any': 'off',
      // Nest's own convention uses `err: any` in catch bindings.
      '@typescript-eslint/no-empty-object-type': 'off',
      // Express's `declare global { namespace Express { ... } }` augmentation
      // is the documented way to type `req.user`; only object-literal
      // namespaces are the target of this rule.
      '@typescript-eslint/no-namespace': ['error', { allowDeclarations: true }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_'
        }
      ],
      // Empty catch is used deliberately around JSON.parse of cached state.
      'no-empty': ['error', { allowEmptyCatch: true }]
    }
  }
);
