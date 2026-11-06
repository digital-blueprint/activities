import {assert} from 'chai';
import {encodeLatin1} from '../src/csv.js';

import '../src/dbp-prepare-media-transparency-report.js';

suite('CSV Latin-1 encoding', () => {
    test('writes Latin-1 bytes into the downloaded file without a BOM', async () => {
        const file = new File([encodeLatin1('Ä;ö;ü;ß\r\n')], 'report.csv', {
            type: 'text/csv;charset=iso-8859-1',
        });
        assert.deepEqual(
            Array.from(new Uint8Array(await file.arrayBuffer())),
            [0xc4, 0x3b, 0xf6, 0x3b, 0xfc, 0x3b, 0xdf, 0x0d, 0x0a],
        );
    });

    test('rejects characters outside Latin-1 instead of corrupting the export', () => {
        for (const text of ['€', '“quoted”', '😀']) {
            assert.throws(() => encodeLatin1(text), 'description-csv-encoding-error');
        }
    });
});

suite('dbp-prepare-media-transparency-report basics', () => {
    let node;

    setup(async () => {
        node = document.createElement('dbp-prepare-media-transparency-report');
        document.body.appendChild(node);
        await node.updateComplete;
    });

    teardown(() => {
        node.remove();
    });

    test('should render', () => {
        assert.isNotNull(node.shadowRoot);
    });
});
