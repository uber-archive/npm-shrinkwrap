var path = require('path');
var readJSON = require('read-json');
var parallelLimit = require('run-parallel-limit');

var analyzeDependency = require('./analyze-dependency.js');

module.exports = verifyGit;

function verifyGit(opts, callback) {
    if (typeof opts === 'string') {
        opts = { dirname: opts };
    }

    var packageFile = path.join(opts.dirname, 'package.json');

    readJSON(packageFile, onpackage);

    function onpackage(err, package) {
        if (err) {
            return callback(err);
        }

        var deps = package.dependencies || {};
        var devDeps = package.devDependencies || {};

        parallelLimit([
            analyze.bind(null, deps, opts),
            opts.dev ? analyze.bind(null, devDeps, opts) : null
        ].filter(Boolean), opts.limit, function (err, values) {
            if (err) {
                return callback(err);
            }

            var errors = values[0].concat(values[1] || []);

            callback(null, errors);
        });
    }
}

function analyze(deps, opts, callback) {
    var tasks = Object.keys(deps).map(function (key) {
        return analyzeDependency.bind(null,
            key, deps[key], opts);
    });

    parallelLimit(tasks, opts.limit, function (err, results){
        if (err) {
            return callback(err);
        }

        var errors = Object.keys(results)
            .reduce(function (acc, key) {
                if (results[key]) {
                    acc.push(results[key]);
                }
                return acc;
            }, []);

        callback(null, errors);
    });
}


