var path = require('path');
var url = require('url');
var parallel = require('run-parallel');
var series = require('run-series');
var template = require('string-template');

var read = require('./read.js');
var purgeExcess = require('./purge-excess.js');
var installModule = require('./install-module.js');

var NPM_URI = 'https://registry.npmjs.org/{name}/-/{name}-{version}.tgz';

module.exports = forceInstall;

function forceInstall(nodeModules, shrinkwrap, opts, cb) {
    if (typeof opts === 'function') {
        cb = opts;
        opts = {};
    }

    // if no dependencies object then terminate recursion
    if (shrinkwrap.name && !shrinkwrap.dependencies) {
        return purgeExcess(nodeModules, shrinkwrap, opts, cb);
    }

    var deps = shrinkwrap.dependencies;
    // console.log('shrinkwrap', shrinkwrap);
    var tasks = Object.keys(deps).map(function (key) {
        var dep = deps[key];
        if (!dep.name) {
            dep.name = key;
        }
        var filePath = path.join(nodeModules, key);

        return isCorrect.bind(null, filePath, dep, opts);
    });

    tasks.push(purgeExcess.bind(
        null, nodeModules, shrinkwrap, opts));

    parallel(tasks, function (err, results) {
        if (err) {
            return cb(err);
        }

        opts.dev = false;

        // remove purgeExcess result
        results.pop();

        var incorrects = results.filter(function (dep) {
            return !dep.correct;
        });
        var corrects = results.filter(function (dep) {
            return dep.correct;
        });

        /*  for each incorrect

             - install it
             - remove excess
             - force install all children


        */
        var inCorrectTasks = incorrects.map(function (incorrect) {
            var name = incorrect.name;
            var folder = path.join(nodeModules,
                name, 'node_modules');

            return series.bind(null, [
                installModule.bind(
                    null, nodeModules, incorrect, opts),
                forceInstall.bind(null, folder, incorrect, opts)
            ]);
        });
        var correctTasks = corrects.map(function (correct) {
            var name = correct.name;
            var folder = path.join(nodeModules, name,
                'node_modules');

            return forceInstall.bind(
                null, folder, correct, opts);
        });

        /* for each correct

            - force install all children
        */

        var tasks = [].concat(inCorrectTasks, correctTasks);

        parallel(tasks, cb);
    });
}


function isCorrect(filePath, dep, opts, cb) {
    var createUri = opts.createUri || defaultCreateUri;

    dep.resolved = dep.resolved ||
        createUri(dep.name, dep.version);

    var resolvedUri = url.parse(dep.resolved);

    if (resolvedUri.protocol === 'http:' ||
        resolvedUri.protocol === 'https:'
    ) {
        return isCorrectVersion(filePath, dep, cb);
    } else if (resolvedUri.protocol === 'git:' ||
        resolvedUri.protocol === 'git+ssh:' ||
        resolvedUri.protocol === 'git+http:' ||
        resolvedUri.protocol === 'git+https:'
    ) {
        isCorrectSHA(filePath, dep, cb);
    } else {
        cb(new Error('unsupported protocol ' +
            resolvedUri.protocol));
    }
}

function isCorrectVersion(filePath, dep, cb) {
    var expectedVersion = dep.version;

    read.package(filePath, function (err, json) {
        if (err) {
            if (err && err.code === 'ENOENT') {
                dep.correct = false;
                return cb(null, dep);
            } else if (err && !err.code) {
                dep.correct = false;
                return cb(null, dep);
            }

            return cb(err);
        }

        var actualVersion = json.version;

        dep.correct = actualVersion === expectedVersion;
        cb(null, dep);
    });
}

function isCorrectSHA(filePath, dep, cb) {
    var expectedSha = getSha(dep.resolved);

    read.package(filePath, function (err, json) {
        if (err) {
            if (err && err.code === 'ENOENT') {
                dep.correct = false;
                return cb(null, dep);
            }

            return cb(err);
        }

        // gaurd against malformed node_modules by forcing
        // a re-install
        if (!json._resolved) {
            dep.correct = false;
            return cb(null, dep);
        }

        var actualSha = getSha(json._resolved);

        dep.correct = actualSha === expectedSha;

        cb(null, dep);
    });
}

function getSha(uri) {
    var parts = url.parse(uri);
    return parts.hash && parts.hash.substr(1);
}

function defaultCreateUri(name, version) {
    return template(NPM_URI, {
        name: name,
        version: version
    });
}
