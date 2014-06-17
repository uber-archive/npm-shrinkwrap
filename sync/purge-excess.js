var path = require('path');
var fs = require('fs');
var parallel = require('run-parallel');
var rimraf = require('rimraf');

module.exports = purgeExcess;

/*  given the shrinkwrap & package.json, find all extra folders
    in top level node_modules directory and remove them

    Basically like `npm prune` except recursive
*/
function purgeExcess(dir, shrinkwrap, opts, cb) {
    if (typeof opts === 'function') {
        cb = opts;
        opts = {};
    }

    findExcess(dir, shrinkwrap, opts, function (err, excessFiles) {
        if (err) {
            // if no node_modules then nothign to purge
            if (err.code === 'ENOENT') {
                return cb(null);
            }
            return cb(err);
        }

        var tasks = excessFiles.map(function (file) {
            var filePath = path.join(dir, file);
            console.log('removing', filePath);
            return rimraf.bind(null, filePath);
        });

        parallel(tasks, cb);
    });
}

/* find any excess folders in node_modules that are not in
    deps.
*/
function findExcess(dir, shrinkwrap, opts, cb) {
    fs.readdir(dir, function (err, files) {
        if (err) {
            return cb(err);
        }

        files = files.map(function (file) {
            return file.toLowerCase();
        }).filter(function (file) {
            // remove node_modules/.bin from check
            return file !== '.bin';
        });

        if (opts.dev && shrinkwrap.devDependencies) {
            var devDeps = shrinkwrap.devDependencies;
            var devKeys = Object.keys(devDeps).map(function (s) {
                return s.toLowerCase();
            });

            files = files.filter(function (file) {
                // remove anything that is a dev dep
                return devKeys.indexOf(file) === -1;
            });
        }

        var deps = shrinkwrap.dependencies || {};
        var keys = Object.keys(deps).map(function (s) {
            return s.toLowerCase();
        });

        // return all files in node_modules that are not
        // in npm-shrinkwrap.json
        cb(null, files.filter(function (file) {
            return keys.indexOf(file) === -1;
        }));
    });
}
