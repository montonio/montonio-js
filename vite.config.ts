import { defineConfig } from 'vite';
import { resolve } from 'path';
import typescript from '@rollup/plugin-typescript';

export default defineConfig({
    build: {
        target: 'es2018',
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: 'Montonio',
            fileName: (format) => `montonio.${format}.js`,
            formats: ['es', 'umd'],
        },
        rollupOptions: {
            plugins: [typescript()],
        },
    },
});
