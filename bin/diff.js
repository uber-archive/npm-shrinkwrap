var parallel = require('run-parallel');
var path = require('path');
var readJSON = require('read-json');
var jsonDiff = require('json-diff');
var colorize = require('json-diff/lib/colorize');
var exec = require('child_process').exec;
var jsonParse = require('safe-json-parse');

/*jshint camelcase: false*/
function purgeDeps(opts, diff, meta) {
    if (!diff) {
        return;
    }

    var depsKey = 'dependencies' in diff ?
        'dependencies' : 'dependencies__deleted' in diff ?
        'dependencies__deleted' : 'dependencies__added' in diff ?
        'dependencies__added' : null;
    if (!depsKey) {
        return diff;
    }

    var deps = diff[depsKey];

    diff[depsKey] = Object.keys(deps).reduce(function (acc, key) {
        var deleted = meta.deleted ? meta.deleted :
            (key.indexOf('__deleted') !== -1 ||
            depsKey === 'dependencies__deleted');
        var added = meta.added ? meta.added :
            (key.indexOf('__added') !== -1 ||
            depsKey === 'dependencies__added');
        if (deleted || added) {
            if (meta.depth >= opts.depth) {
                if (!opts.short) {
                    deps[key].dependencies = '[NestedObject]';
                    acc[key] = deps[key];
                } else {
                    acc[key] = (deleted ? '[Deleted' : '[Added') +
                        '@' + deps[key].version + ']';
                }
            } else {
                acc[key] = purgeDeps(opts, deps[key], {
                    depth: meta.depth + 1,
                    added: added,
                    deleted: deleted
                });
            }
        } else {
            acc[key] = purgeDeps(opts, deps[key], {
                depth: meta.depth + 1
            });
        }

        return acc;
    }, {});

    return diff;
}

function diffContent(oldContent, newContent, opts) {
    var diff = jsonDiff.diff(oldContent, newContent);

    diff = purgeDeps(opts, diff, {
        depth: 0
    });

    return colorize.colorize(diff, {
        color: opts.color
    });
}

function gitShow(sha, cwd, callback) {
    function ongit(err, stdout, stderr) {
        if (stderr) {
            console.error(stderr);
        }

        if (err && err.message.indexOf('not in \'HEAD\'') !== -1) {
            return callback(null, {});
        }

        if (err) {
            return callback(err);
        }

        jsonParse(stdout, callback);
    }

    exec('git show ' + sha + ':npm-shrinkwrap.json', {
        cwd: cwd || process.cwd()
    }, ongit);
}

function isFile(fileName) {
    var index = fileName.indexOf('.json');

    return index !== -1 && index === fileName.length - 5;
}

function main(opts, callback) {
    var fileA = opts._[0];
    var fileB = opts._[1];

    if (!fileB) {
        fileB = 'npm-shrinkwrap.json';
    }

    if (!fileA) {
        fileA = 'HEAD';
    }

    if (!("color" in opts)) {
        opts.color = process.stdout.isTTY;
    } else if (opts.color === "false") {
        opts.color = false;
    }

    if (!("short" in opts)) {
        opts.short = true;
    }

    opts.depth = 'depth' in opts ? opts.depth : 0;
    var cwd = opts.dirname || process.cwd();

    parallel([
        isFile(fileA) ?
            readJSON.bind(null, path.resolved(cwd, fileA)) :
            gitShow.bind(null, fileA, cwd),
        isFile(fileB) ?
            readJSON.bind(null, path.resolve(cwd, fileB)) :
            gitShow.bind(null, fileB, cwd)
    ], function (err, files) {
        if (err) {
            return callback(err);
        }

        callback(null, diffContent(files[0], files[1], opts));
    });
}

module.exports = main;
