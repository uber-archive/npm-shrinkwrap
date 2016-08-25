var path = require('path');
var fs = require('graceful-fs');
var parallel = require('run-parallel');
var rimraf = require('rimraf');
var flatten = require('array-flatten');

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

    findExcess(dir, shrinkwrap, opts, null, function (err, excessFiles) {
        if (err) {
            // if no node_modules then nothing to purge
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
function findExcess(dir, shrinkwrap, opts, scope, cb) {  // jshint ignore:line
    fs.readdir(dir, function (err, files) {
        if (err) {
            return cb(err);
        }

        parallel(files.map(function (file) {
            return validateExcess.bind(null, dir, file, shrinkwrap, opts,
              scope);
        }), function (err, excessFiles) {
            if (err) {
                return cb(err);
            }
            return cb(null, flatten(excessFiles || []).filter(Boolean));
        });
    });
}

/* find any excess folders in node_modules that are not in
    deps.
*/
function validateExcess(dir, file, shrinkwrap, opts, scope, cb) {  // jshint ignore:line
    file = file.toLowerCase();

    // don't consider node_modules/.bin
    if (file === '.bin') {
        return cb();
    }

    // consider top-level scoped packages only; e.g. those nested at the level
    // node_modules/{*}
    var isScopedDir = file[0] === '@';
    if (isScopedDir) {
        return findExcess(path.join(dir, scope + '/' + file), shrinkwrap, opts,
          file, cb);
    }

    // the file is in excess if it does not exist in the package.json's
    // dev dependencies; this step is skipped if we are not analyzing
    // dev dependencies
    if (opts.dev && shrinkwrap.devDependencies &&
        lowercaseContains(Object.keys(shrinkwrap.devDependencies), file)) {
        return cb();
    }

    // the file is in excess if it does not exist in the package.json's
    // regular dependencies
    if (shrinkwrap.dependencies && lowercaseContains(Object.keys(shrinkwrap.dependencies), file)) {
        return cb();
    }

    // if all checks pass up until this point, the file is in excess
    return cb(null, [file]);
}

/* check if the element (as a string) is contained in the array of strings
   in a case-insensitive fashion.
*/
function lowercaseContains(arr, elem) {
    return arr.map(function (arrElem) {
        return arrElem.toLowerCase();
    }).indexOf(elem) !== -1;
}
