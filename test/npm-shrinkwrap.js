var test = require('tape');
var fixtures = require('fixtures-fs');
var path = require('path');
var fs = require('fs');

var npmShrinkwrap = require('../index.js');

var PROJ = path.join(__dirname, 'proj');
var SHA = 'e8db5304e8e527aa17093cd9de66725118d9b589';

var OPT = PROJ;
if (process.env.useGlobalNPM) {
  OPT = {
    dirname: PROJ,
    useGlobalNPM: process.env.useGlobalNPM
  };
}

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
    npmShrinkwrap(OPT, function (err) {
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

test('creates simple shrinkwrap for scoped package', fixtures(__dirname, {
    'proj': moduleFixture('proj', '0.1.0', {
        dependencies: {
            "@th507/foo": '1.0.0'
        },
        'node_modules': {
            '@th507' : {
                'foo': moduleFixture('@th507/foo', '1.0.0')
            }
        }
    })
}, function (assert) {
    // old version of npm which is bundled w/ this package
    // does not support scoped package and will failed.
    // setting use-global-npm for this test case only
    var _OPT;
    if (typeof OPT === "string") {
        _OPT = {
            dirname: OPT,
            useGlobalNPM: 1
        };
    }
    else {
        _OPT = Object.create(OPT);
        _OPT.useGlobalNPM = 1;
    }

    npmShrinkwrap(_OPT, function (err) {
        assert.ifError(err);

        var shrinkwrap = path.join(PROJ, 'npm-shrinkwrap.json');
        fs.readFile(shrinkwrap, 'utf8', function (err, file) {
            assert.ifError(err);
            assert.notEqual(file, '');

            var json = JSON.parse(file);

            assert.equal(json.name, 'proj');
            assert.equal(json.version, '0.1.0');
            assert.deepEqual(json.dependencies, {
                '@th507/foo': {
                    version: '1.0.0',
                    resolved: 'https://registry.npmjs.org/@th507/foo/-/@th507/foo-1.0.0.tgz'
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

test('error on removed module', fixtures(__dirname, {
    proj: moduleFixture('proj', '0.1.0', {
        dependencies: {},
        'node_modules': {
            'foo': moduleFixture('foo', '1.0.0')
        }
    })
}, function (assert) {
    // debugger;
    npmShrinkwrap(OPT, function (err) {
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
    npmShrinkwrap(OPT, function (err) {
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
    npmShrinkwrap(OPT, function (err) {
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
    npmShrinkwrap(OPT, function (err) {
        assert.ok(err);

        assert.notEqual(err.message.indexOf(
            'extraneous: foo@1.0.0'), -1);

        assert.end();
    });
}));

test('error on additional GIT module', fixtures(__dirname, {
    proj: moduleFixture('proj', '0.1.0', {
        dependencies: {
            'foo': 'git://github.com:uber/foo#v1.0.0'
        },
        'node_modules': {}
    })
}, function (assert) {
    npmShrinkwrap(OPT, function (err) {
        assert.ok(err);

        assert.notEqual(err.message.indexOf(
            'missing: foo@git://github.com'), -1);

        assert.notEqual(err.message.indexOf(
            'uber/foo'), -1);

        assert.notEqual(err.message.indexOf(
            '#v1.0.0'), -1);

        assert.end();
    });
}));

test('error on invalid GIT module', fixtures(__dirname, {
    proj: moduleFixture('proj', '0.1.0', {
        dependencies: {
            'foo': 'git://github.com:uber/foo#v1.0.1'
        },
        'node_modules': {
            'foo': gitModuleFixture('foo', '1.0.0')
        }
    })
}, function (assert) {
    npmShrinkwrap(OPT, function (err) {
        assert.ok(err);

        assert.notEqual(err ? err.message.indexOf(
            'invalid: foo@1.0.0') : -1, -1);

        assert.end();
    });
}));
