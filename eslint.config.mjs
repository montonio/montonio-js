import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import prettierPlugin from 'eslint-plugin-prettier';
import prettier from 'eslint-config-prettier';

export default [
    js.configs.recommended,
    ...tseslint.configs.recommended,
    prettier,
    {
        ignores: ['.prettierrc.js', 'node_modules/**', 'dist/**'],
    },
    {
        // Config for all files
        files: ['**/*.{js,mjs,cjs,jsx,ts,tsx,mts}'],
        plugins: {
            prettier: prettierPlugin,
        },
        rules: {
            'prettier/prettier': 'error',
            'block-scoped-var': 'error',
            eqeqeq: 'error',
            'no-var': 'error',
            'prefer-const': 'error',
            'eol-last': 'error',
            'prefer-arrow-callback': 'error',
            'no-trailing-spaces': 'error',
            quotes: ['warn', 'single', { avoidEscape: true }],
            'no-restricted-properties': [
                'error',
                {
                    object: 'describe',
                    property: 'only',
                },
                {
                    object: 'it',
                    property: 'only',
                },
            ],
        },
    },
    {
        // JavaScript specific config
        files: ['**/*.{js,mjs,cjs,jsx}'],
        languageOptions: {
            globals: {
                ...globals.browser,
            },
            ecmaVersion: 'latest',
            sourceType: 'module',
        },
    },
    {
        // TypeScript specific config for source files
        files: ['src/**/*.{ts,tsx,mts}'],
        languageOptions: {
            globals: {
                ...globals.browser,
            },
            parser: tseslint.parser,
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
                project: './tsconfig.json',
            },
        },
        rules: {
            'no-dupe-class-members': 'off',
            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/no-unused-vars': 'error',
            '@typescript-eslint/require-await': 'error',
            '@typescript-eslint/ban-ts-comment': 'warn',
            '@typescript-eslint/no-non-null-assertion': 'off',
            '@typescript-eslint/no-use-before-define': 'off',
            '@typescript-eslint/no-empty-function': 'off',
            '@typescript-eslint/no-var-requires': 'off',
            '@typescript-eslint/explicit-module-boundary-types': 'off',
            '@typescript-eslint/ban-types': 'off',
            '@typescript-eslint/only-throw-error': 'error',
            '@typescript-eslint/no-floating-promises': 'error',
            '@typescript-eslint/no-warning-comments': 'off',
        },
    },
];
