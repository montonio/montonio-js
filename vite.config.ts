import { defineConfig } from 'vite';
import { resolve } from 'path';
import typescript from '@rollup/plugin-typescript';

export default defineConfig({
    build: {
        target: 'ES2018',
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: 'Montonio',
            formats: ['es', 'umd'],
            fileName: (format) => `montonio.${format}.js`,
        },
        rollupOptions: {
            plugins: [typescript()],
        },
    },
});
