import {assert} from 'chai';

import '../src/dbp-portfolio.js';

suite('dbp-portfolio basics', () => {
    let node;

    setup(async () => {
        node = document.createElement('dbp-portfolio');
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
