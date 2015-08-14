var path = require('path');
// var fs = require('fs');
// var readJSON = require('read-json');
var parallel = require('run-parallel');
var loadNPM = require('../load-npm.js');
// var rimraf = require('rimraf');

var read = require('./read.js');
var forceInstall = require('./force-install.js');

/* sync shrinkwrap

 - read npm-shrinkwrap.json
 - walk it and write it into node_modules
 - remove any excess shit from node_modules

*/

module.exports = syncShrinkwrap;

function syncShrinkwrap(opts, cb) {
    var dirname = opts.dirname || process.cwd();

    var npmOpts = {
        prefix: opts.dirname,
        loglevel: 'error'
    };

    if (opts.registry) {
        npmOpts.registry = opts.registry;
    }

    loadNPM(opts.useGlobalNPM, npmOpts, function (err, npm) {
        if (err) {
            return cb(err);
        }

        opts.npm = npm;

        parallel({
            shrinkwrap: read.shrinkwrap.bind(null, dirname),
            devDependencies: read.devDependencies.bind(null, dirname)
        }, function (err, tuple) {
            if (err) {
                return cb(err);
            }

            var nodeModules = path.join(dirname, 'node_modules');
            var shrinkwrap = tuple.shrinkwrap;
            shrinkwrap.devDependencies = tuple.devDependencies;

            opts.dev = true;

            forceInstall(nodeModules, shrinkwrap, opts, cb);
        });
    });
}

