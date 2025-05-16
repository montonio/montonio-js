import { defineConfig } from 'vite';
import { resolve } from 'path';
import typescript from '@rollup/plugin-typescript';

export default defineConfig({
    build: {
        target: 'ES2018',
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: 'Montonio',
            fileName: (format) => {
                return format === 'umd' ? 'montonio.js' : 'montonio.mjs';
            },
            formats: ['es', 'umd'],
        },
        rollupOptions: {
            plugins: [typescript()],
        },
    },
});
