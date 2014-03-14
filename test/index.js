var test = require('tape');

var npmShrinkwrap = require('../index.js');

test('npmShrinkwrap is a function', function (assert) {
    assert.strictEqual(typeof npmShrinkwrap, 'function');
    assert.end();
});
