var path = require('path');
var parallel = require('run-parallel');
var npm = require('npm');

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

    npm.load(npmOpts, function (err, npm) {
        if (err) {
            return cb(err);
        }

        opts.npm = npm;

        parallel({
            shrinkwrap: read.shrinkwrap.bind(null, dirname),
            dependencies: read.dependencies.bind(null, dirname)
        }, function (err, tuple) {
            if (err) {
                return cb(err);
            }

            var nodeModules = path.join(dirname, 'node_modules');
            var dependencies = tuple.dependencies;
            var shrinkwrap = tuple.shrinkwrap;

            // first, we check that package.json dependencies and shrinkwrap
            // top-level dependencies are in sync. this should cover the case
            // where a dependency was added or removed to package.json, but
            // shrinkwrap was not subsequently run.
            var packageJsonDependencies =
                Object.keys(dependencies.dependencies);
            var shrinkwrapTopLevelDependencies =
                Object.keys(shrinkwrap.dependencies);

            var excessPackageJsonDependencies = packageJsonDependencies
                .filter(function (x) {
                    return shrinkwrapTopLevelDependencies.indexOf(x) === -1;
                });
            var excessShrinkwrapDependencies = shrinkwrapTopLevelDependencies
                .filter(function (x) {
                    return packageJsonDependencies.indexOf(x) === -1;
                });

            shrinkwrap.devDependencies = tuple.dependencies.devDependencies;

            opts.dev = true;

            forceInstall(nodeModules, shrinkwrap, opts,
                function(err, erroneousDependencies) {
                    // If there is a legitimate error, or we are not running
                    // `check`, bubble it up immediately
                    if (err || opts.dry !== true) {
                        return cb(err);
                    }

                    // Generate the error report
                    if (erroneousDependencies.length !== 0 ||
                        excessPackageJsonDependencies.length !== 0 ||
                        excessShrinkwrapDependencies.length !== 0
                    ) {
                        return cb(
                            new Error('npm-shrinkwrap.json is out of sync'),
                            {
                                excessPackageJsonDependencies:
                                    excessPackageJsonDependencies,
                                excessShrinkwrapDependencies:
                                    excessShrinkwrapDependencies,
                                erroneouslyInstalledDependencies:
                                    erroneousDependencies,
                            });
                    }
                    cb(null);
                });
        });
    });
}

