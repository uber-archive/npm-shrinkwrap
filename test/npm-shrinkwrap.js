var test = require('tape');
var fixtures = require('fixtures-fs');
var path = require('path');
var fs = require('graceful-fs');

var npmShrinkwrap = require('../index.js');

var PROJ = path.join(__dirname, 'proj');
var SHA = 'e8db5304e8e527aa17093cd9de66725118d9b589';

function moduleFixture(name, version, opts) {
    opts = opts || {};

    var module = {
        'package.json': JSON.stringify({
            name: name,
            _id: name + '@' + version,
            _from: name + '@^' + version,
            version: version,
            dependencies: opts.dependencies ?
                opts.dependencies : undefined
        })
    };

    /*jshint camelcase: false*/
    if (opts.node_modules) {
        module.node_modules = opts.node_modules;
    }

    return module;
}

function gitModuleFixture(name, version, opts) {
    opts = opts || {};

    var module = {
        'package.json': JSON.stringify({
            name: name,
            _id: name + '@' + version,
            _from: 'git://github.com/uber/' + name + '#v' + version,
            _resolved: 'git://github.com/uber/' + name + '#' + SHA,
            version: version,
            dependencies: opts.dependencies ?
                opts.dependencies : undefined
        })
    };

    /*jshint camelcase: false*/
    if (opts.node_modules) {
        module.node_modules = opts.node_modules;
    }

    return module;
}

function gitSSHModuleFixture(name, version, opts) {
    opts = opts || {};

    var module = {
        'package.json': JSON.stringify({
            name : name,
            _id: name + '@' + version,
            _from: 'git+ssh://git@github.com:uber/' + name + '#v' + version,
            _resolved: 'git+ssh://git@github.com/uber/' + name + '#' + SHA,
            version: version,
            dependencies: opts.dependencies || undefined
        })
    };

    /*jshint camelcase: false*/
    if (opts.node_modules) {
        module.node_modules = opts.node_modules;
    }

    return module;
}

test('npmShrinkwrap is a function', function (assert) {
    assert.strictEqual(typeof npmShrinkwrap, 'function');
    assert.end();
});

test('creates simple shrinkwrap', fixtures(__dirname, {
    'proj': moduleFixture('proj', '0.1.0', {
        dependencies: {
            foo: '2.0.0'
        },
        'node_modules': {
            'foo': moduleFixture('foo', '2.0.0')
        }
    })
}, function (assert) {
    npmShrinkwrap(PROJ, function (err) {
        assert.ifError(err);

        var shrinkwrap = path.join(PROJ, 'npm-shrinkwrap.json');
        fs.readFile(shrinkwrap, 'utf8', function (err, file) {
            assert.ifError(err);
            assert.notEqual(file, '');

            var json = JSON.parse(file);

            assert.equal(json.name, 'proj');
            assert.equal(json.version, '0.1.0');
            assert.deepEqual(json.dependencies, {
                foo: {
                    version: '2.0.0',
                    resolved: 'https://registry.npmjs.org/foo/-/foo-2.0.0.tgz'
                }
            });

            assert.end();
        });
    });
}));

test('create shrinkwrap for git dep', fixtures(__dirname, {
    'proj': moduleFixture('proj', '0.1.0', {
        dependencies: {
            bar: 'git+ssh://git@github.com:uber/bar#v2.0.0'
        },
        'node_modules': {
            'bar': gitModuleFixture('bar', '2.0.0')
        }
    })
}, function (assert) {
    npmShrinkwrap(PROJ, function (err) {
        assert.ifError(err);

        var shrinkwrap = path.join(PROJ, 'npm-shrinkwrap.json');
        fs.readFile(shrinkwrap, 'utf8', function (err, file) {
            assert.ifError(err);
            assert.notEqual(file, '');

            var json = JSON.parse(file);

            assert.equal(json.name, 'proj');
            assert.equal(json.version, '0.1.0');
            assert.deepEqual(json.dependencies, {
                bar: {
                    version: '2.0.0',
                    from: 'bar@git://github.com/uber/bar#' + SHA,
                    resolved: 'git://github.com/uber/bar#' + SHA
                }
            });

            assert.end();
        });
    });
}));

test('create shrinkwrap for git+ssh dep', fixtures(__dirname, {
    'proj': moduleFixture('proj', '0.1.0', {
        dependencies: {
            baz: 'git+ssh://git@github.com:uber/baz#v2.0.0'
        },
        'node_modules': {
            'baz': gitSSHModuleFixture('baz', '2.0.0')
        }
    })
}, function (assert) {
    npmShrinkwrap(PROJ, function (err) {
        assert.ifError(err);

        var shrinkwrap = path.join(PROJ, 'npm-shrinkwrap.json');
        fs.readFile(shrinkwrap, 'utf8', function (err, file) {
            assert.ifError(err);
            assert.notEqual(file, '');

            var json = JSON.parse(file);

            assert.equal(json.name, 'proj');
            assert.equal(json.version, '0.1.0');
            assert.deepEqual(json.dependencies, {
                baz: {
                    version: '2.0.0',
                    from: 'baz@git+ssh://git@github.com/uber/baz#' + SHA,
                    resolved: 'git+ssh://git@github.com/uber/baz#' + SHA
                }
            });

            assert.end();
        });
    });
}));

test('error on removed module', fixtures(__dirname, {
    proj: moduleFixture('proj', '0.1.0', {
        dependencies: {},
        'node_modules': {
            'foo': moduleFixture('foo', '1.0.0')
        }
    })
}, function (assert) {
    // debugger;
    npmShrinkwrap(PROJ, function (err) {
        assert.ok(err);

        assert.notEqual(err.message.indexOf(
            'extraneous: foo@1.0.0'), -1);

        assert.end();
    });
}));

test('error on additional module', fixtures(__dirname, {
    proj: moduleFixture('proj', '0.1.0', {
        dependencies: { 'foo': '1.0.0' },
        'node_modules': {}
    })
}, function (assert) {
    npmShrinkwrap(PROJ, function (err) {
        assert.ok(err);

        assert.notEqual(err.message.indexOf(
            'missing: foo@1.0.0'), -1);

        assert.end();
    });
}));

test('error on invalid module', fixtures(__dirname, {
    proj: moduleFixture('proj', '0.1.0', {
        dependencies: { 'foo': '1.0.1' },
        'node_modules': {
            'foo': moduleFixture('foo', '1.0.0')
        }
    })
}, function (assert) {
    npmShrinkwrap(PROJ, function (err) {
        assert.ok(err);

        assert.notEqual(err.message.indexOf(
            'invalid: foo@1.0.0'), -1);

        assert.end();
    });
}));

test('error on removed GIT module', fixtures(__dirname, {
    proj: moduleFixture('proj', '0.1.0', {
        dependencies: {},
        'node_modules': {
            'foo': gitModuleFixture('foo', '1.0.0')
        }
    })
}, function (assert) {
    // debugger;
    npmShrinkwrap(PROJ, function (err) {
        assert.ok(err);

        assert.notEqual(err.message.indexOf(
            'extraneous: foo@1.0.0'), -1);

        assert.end();
    });
}));

test('error on additional GIT module', fixtures(__dirname, {
    proj: moduleFixture('proj', '0.1.0', {
        dependencies: {
            'foo': 'git://git@github.com:uber/foo#v1.0.0'
        },
        'node_modules': {}
    })
}, function (assert) {
    npmShrinkwrap(PROJ, function (err) {
        assert.ok(err);

        assert.notEqual(err.message.indexOf(
            'missing: foo@git+ssh://git@github.com/uber/foo.git#v1.0.0'), -1);

        assert.end();
    });
}));

test('error on invalid GIT module', fixtures(__dirname, {
    proj: moduleFixture('proj', '0.1.0', {
        dependencies: {
            'foo': 'git://git@github.com:uber/foo#v1.0.1'
        },
        'node_modules': {
            'foo': gitModuleFixture('foo', '1.0.0')
        }
    })
}, function (assert) {
    npmShrinkwrap(PROJ, function (err) {
        assert.ok(err);

        assert.notEqual(err ? err.message.indexOf(
            'invalid: foo@1.0.0') : -1, -1);

        assert.end();
    });
}));

test('create shrinkwrap for scoped package', fixtures(__dirname, {
    proj: moduleFixture('proj', '0.1.0', {
        dependencies: {
            '@uber/foo': '1.0.0'
        },
        'node_modules': {
            '@uber': {
                'foo': moduleFixture('@uber/foo', '1.0.0')
            }
        }
    })
}, function (assert) {
    npmShrinkwrap(PROJ, function (err) {
        assert.ifError(err);

        var shrinkwrap = path.join(PROJ, 'npm-shrinkwrap.json');
        fs.readFile(shrinkwrap, 'utf8', function (err, file) {
            assert.ifError(err);
            assert.notEqual(file, '');

            var json = JSON.parse(file);

            assert.equal(json.name, 'proj');
            assert.equal(json.version, '0.1.0');
            assert.deepEqual(json.dependencies, {
                '@uber/foo': {
                    version: '1.0.0',
                    resolved: 'https://registry.npmjs.org/@uber/foo/-/@uber/foo-1.0.0.tgz'
                }
            });

            assert.end();
        });
    });
}));
