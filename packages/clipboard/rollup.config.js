import {globSync} from 'node:fs';
import terser from '@rollup/plugin-terser';
import serve from 'rollup-plugin-serve';
import {assetPlugin} from '@dbp-toolkit/dev-utils';
import process from 'node:process';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const pkg = require('./package.json');

const build = typeof process.env.BUILD !== 'undefined' ? process.env.BUILD : 'local';
console.log('build: ' + build);

export default (async () => {
    return {
        input: build != 'test' ? ['src/dbp-clipboard-management.js'] : globSync('test/**/*.js'),
        output: {
            dir: 'dist',
            entryFileNames: '[name].js',
            chunkFileNames: 'shared/[name].[hash].js',
            format: 'esm',
            sourcemap: true,
            cleanDir: true,
        },
        preserveEntrySignatures: false,
        onwarn: function (warning, warn) {
            // ignore chai warnings
            if (warning.code === 'CIRCULAR_DEPENDENCY') {
                return;
            }
            warn(warning);
        },
        plugins: [
            build !== 'local' && build !== 'test' ? terser() : false,
            await assetPlugin(pkg.name, 'dist', {
                copyTargets: [
                    {src: 'assets/index.html', dest: 'dist'},
                    {src: 'assets/favicon.ico', dest: 'dist'},
                ],
            }),
            process.env.ROLLUP_WATCH === 'true'
                ? serve({contentBase: 'dist', host: '127.0.0.1', port: 8002})
                : false,
        ],
    };
})();
