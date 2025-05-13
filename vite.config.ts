import { defineConfig } from 'vite';
import { resolve } from 'path';
import typescript from '@rollup/plugin-typescript';
import replace from '@rollup/plugin-replace';
import pkg from './package.json';

export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: 'MontonioJS',
            fileName: (format) => `montonio.${format}.js`,
        },
        rollupOptions: {
            // UMD build
            input: {
                main: resolve(__dirname, 'src/index.ts'),
                umd: resolve(__dirname, 'src/umd.ts'),
            },
            output: [
                {
                    // ESM
                    format: 'es',
                    entryFileNames: 'esm/[name].js',
                    preserveModules: true,
                    preserveModulesRoot: 'src',
                },
                {
                    // CommonJS
                    format: 'cjs',
                    entryFileNames: 'cjs/[name].js',
                    preserveModules: true,
                    preserveModulesRoot: 'src',
                },
                {
                    // UMD (only for umd entry)
                    format: 'umd',
                    name: 'Montonio',
                    entryFileNames: 'umd/montonio.js',
                    inlineDynamicImports: true,
                    globals: {},
                },
            ],
            plugins: [
                typescript({
                    tsconfig: './tsconfig.json',
                    declaration: true,
                    declarationDir: './dist/types',
                }),
                replace({
                    preventAssignment: true,
                    'process.env.NODE_ENV': JSON.stringify('production'),
                    VERSION: JSON.stringify(pkg.version),
                }),
            ],
        },
    },
});
