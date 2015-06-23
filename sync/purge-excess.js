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
    var files = [];
    try {
      files = fs.readdirSync(dir);
    } catch (e) {
      // re-create fs.readdir(...) error
      return cb(e);
    }

    var i = 0;
    while (i < files.length) {
        // remove node_modules/.bin from check
        if (/\.bin$/.test(files[i])) {
            files.splice(i, 1);
        }
        // remove scoped packages in node_modules
        else if (files[i][0] === "@" && files[i].indexOf("/") === -1) {
            var subGroup = fs.readdirSync(path.join(dir, files[i]));
            /* jslint loopfunc: true */
            [].splice.apply(files, [i, 1].concat(subGroup.map(function(g) {
                return path.join(files[i], g);
            })));
        }
        else {
            files[i] = files[i].toLowerCase();
            i++;
        }
    }
  
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
}
