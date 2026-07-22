import {globSync} from 'node:fs';
import serve from 'rollup-plugin-serve';
import {assetPlugin, getPort, getResolveModules} from '@dbp-toolkit/dev-utils';
import process from 'node:process';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const pkg = require('./package.json');

const build = typeof process.env.BUILD !== 'undefined' ? process.env.BUILD : 'local';
console.log('build: ' + build);

export default (async () => {
    return {
        input:
            build != 'test'
                ? ['src/dbp-prepare-media-transparency-report.js']
                : globSync('test/**/*.js'),
        output: {
            dir: 'dist',
            entryFileNames: '[name].js',
            chunkFileNames: 'shared/[name].[hash].js',
            format: 'esm',
            sourcemap: true,
            cleanDir: true,
        },
        resolve: {
            modules: getResolveModules(),
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
            await assetPlugin(pkg.name, 'dist', {
                copyTargets: [
                    {src: 'assets/index.html', dest: 'dist'},
                    {src: 'assets/favicon.ico', dest: 'dist'},
                ],
            }),
            process.env.ROLLUP_WATCH === 'true'
                ? serve({
                      contentBase: 'dist',
                      host: '127.0.0.1',
                      port: await getPort('127.0.0.1', [8002, 8004]),
                  })
                : false,
        ],
    };
})();
