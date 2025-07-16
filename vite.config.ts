import { defineConfig } from 'vite';
import { resolve } from 'path';
import typescript from '@rollup/plugin-typescript';
import replace from '@rollup/plugin-replace';
import { readFileSync } from 'fs';

const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig(({ mode }) => {
    const tsconfigPath = mode === 'live' ? './tsconfig.live.json' : './tsconfig.json';

    return {
        build: {
            target: 'ES2018',
            lib: {
                entry: resolve(__dirname, 'src/index.ts'),
                name: 'Montonio',
                formats: ['es', 'umd'],
                fileName: (format) => `montonio.${format}.js`,
            },
            sourcemap: true,
            rollupOptions: {
                plugins: [
                    typescript({ tsconfig: tsconfigPath }),
                    replace({
                        __MONTONIO_JS_VERSION__: JSON.stringify(packageJson.version),
                        preventAssignment: true,
                    }),
                ],
            },
        },
    };
});
