import {assert} from 'chai';

import '../src/dbp-prepare-media-transparency-report.js';

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
