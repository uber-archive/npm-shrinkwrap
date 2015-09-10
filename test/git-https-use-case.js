var test = require('tape');
var path = require('path');
var fs = require('graceful-fs');
var safeJsonParse = require('safe-json-parse');
var fixtures = require('fixtures-fs');
var exec = require('child_process').exec;

var shrinkwrapCli = require('../bin/cli.js');

var PROJ = path.join(__dirname, 'proj');

test('npm-shrinkwrap --dev on git+https uri', fixtures(__dirname, {
    'proj': {
        'package.json': JSON.stringify({
            name: 'foo',
            version: '0.1.0',
            dependencies: {},
            devDependencies: {
                'gulp-yuidoc': 'git://github.com/' +
                    'Netflix-Skunkworks/gulp-yuidoc.git' +
                    '#4e9a896c28ddf2fec477eb81766f04b779b320a7'
            }
        })
    }
}, function (assert) {
    exec('npm install', {
        cwd: PROJ
    }, function (err, stdout, stderr) {
        assert.ifError(err);

        if (stderr) {
            console.error(stderr);
        }

        shrinkwrapCli({
            dirname: PROJ,
            dev: true,
            _: []
        }, function (err) {
            assert.ifError(err);

            var file = path.join(PROJ, 'npm-shrinkwrap.json');
            fs.readFile(file, function (err, content) {
                assert.ifError(err);
                content = String(content);

                safeJsonParse(content, function (err, json) {
                    assert.ifError(err);

                    assert.equal(json.name, 'foo');
                    assert.equal(json.version, '0.1.0');
                    assert.ok(json.dependencies['gulp-yuidoc']);

                    var dep = json.dependencies['gulp-yuidoc'];
                    assert.equal(dep.version, '0.1.2');

                    assert.end();
                });
            });
        });
    });
}));

