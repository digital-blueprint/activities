import {globSync} from 'node:fs';
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
        input:
            build != 'test'
                ? ['src/dbp-group-manage.js', 'src/dbp-group-manage-demo.js']
                : globSync('test/**/*.js'),
        output: {
            dir: 'dist',
            entryFileNames: '[name].js',
            chunkFileNames: 'shared/[name].[hash].js',
            format: 'esm',
            sourcemap: true,
            cleanDir: true,
            minify: build !== 'local' && build !== 'test',
        },
        moduleTypes: {
            '.css': 'js', // work around rolldown handling the CSS import before the URL plugin can
        },
        plugins: [
            await assetPlugin(pkg.name, 'dist', {
                copyTargets: [
                    {src: 'assets/silent-check-sso.html', dest: 'dist'},
                    {src: 'assets/index.html', dest: 'dist'},
                ],
            }),
            process.env.ROLLUP_WATCH === 'true'
                ? serve({contentBase: 'dist', host: '127.0.0.1', port: 8002})
                : false,
        ],
    };
})();
