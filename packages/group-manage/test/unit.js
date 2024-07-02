import {assert} from 'chai';

import '../src/dbp-group-manage.js';
import '../src/dbp-group-manage-demo.js';

suite('dbp-group-manage basics', () => {
    let node;

    setup(async () => {
        node = document.createElement('dbp-group-manage');
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

suite('dbp-group-manage-demo basics', () => {
    let node;

    setup(async () => {
        node = document.createElement('dbp-group-manage-demo');
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
