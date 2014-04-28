var ValidationError = require('error/validation');
var find = require('array-find');
var template = require('string-template');
var path = require('path');
var fs = require('fs');
var sortedObject = require('sorted-object');
var readJSON = require('read-json');

var setResolved = require('./set-resolved.js');
var trimFrom = require('./trim-and-sort-shrinkwrap.js');
var verifyGit = require('./verify-git.js');
var walkDeps = require('./walk-shrinkwrap.js');

function npmShrinkwrap(opts, callback) {
    if (typeof opts === 'string') {
        opts = { dirname: opts };
    }

    var _warnings = null;

    getNPM().load({
        prefix: opts.dirname,
        loglevel: 'error'
    }, verifyTree);

    function verifyTree(err, npm) {
        if (err) {
            return callback(err);
        }

        // when running under `npm test` depth is set to 1
        // reset it to a high number like 100
        npm.config.set('depth', 100);

        npm.commands.ls([], true, onls);

        function onls(err, _, pkginfo) {
            if (err) {
                return callback(err);
            }

            if (pkginfo.problems) {
                var error = NPMError(pkginfo);
                return callback(error);
            }

            verifyGit(opts, onverify);
        }

        function onverify(err, errors) {
            if (err) {
                return callback(err);
            }

            if (errors.length === 0) {
                return onnpm(null, npm);
            }

            var error = ValidationError(errors);
            var invalid = find(errors, function (error) {
                return error.type === 'invalid.git.version';
            });

            if (invalid) {
                var msg = 'Problems were encountered\n' +
                    'Please correct and try again\n' +
                    'invalid: {name}@{actual} {dirname}/node_modules/{name}';
                error.message = template(msg, invalid);
            }

            var types = errors.reduce(function (acc, e) {
                if (acc.indexOf(e.type) === -1) {
                    acc.push(e.type);
                }

                return acc;
            }, []);

            if (opts.warnOnNotSemver && types.length === 1 &&
                types[0] === 'gitlink.tag.notsemver'
            ) {
                _warnings = error.errors;
                return onnpm(null, npm);
            }

            callback(error);
        }
    }

    function onnpm(err, npm) {
        if (err) {
            return callback(err);
        }

        var fileName = path.join(opts.dirname, 'npm-shrinkwrap.json');
        readJSON(fileName, onfile);

        function onfile(err, json) {
            if (err) {
                npm.commands.shrinkwrap({}, true, onshrinkwrap);
                return;
            }

            /* npm.commands.shrinkwrap will blow away any
                extra keys that you set.

                We have to read extra keys & set them again
                after shrinkwrap is done
            */
            var keys = Object.keys(json).filter(function (k) {
                return [
                    'name', 'version', 'dependencies'
                ].indexOf(k) === -1;
            });

            npm.commands.shrinkwrap({}, true, onwrapped);

            function onwrapped(err) {
                if (err) {
                    return callback(err);
                }

                readJSON(fileName, onnewfile);
            }

            function onnewfile(err, newjson) {
                if (err) {
                    return callback(err);
                }

                keys.forEach(function (k) {
                    if (!newjson[k]) {
                        newjson[k] = json[k];
                    }
                });

                json = sortedObject(json);
                var buf = JSON.stringify(json, null, 4);
                fs.writeFile(fileName, buf, 'utf8', onshrinkwrap);
            }
        }
    }

    function onshrinkwrap(err) {
        if (err) {
            return callback(err);
        }

        setResolved(opts, onResolved);
    }

    function onResolved(err) {
        if (err) {
            return callback(err);
        }

        trimFrom(opts, ontrim);
    }

    function ontrim(err) {
        if (err) {
            return callback(err);
        }

        var fileName = path.join(opts.dirname, 'npm-shrinkwrap.json');
        readJSON(fileName, onfinalwrap);
    }

    function onfinalwrap(err, shrinkwrap) {
        if (err) {
            return callback(err);
        }

        var warnings = _warnings ? _warnings : [];

        if (opts.validators && Array.isArray(opts.validators) &&
            opts.validators.length !== 0
        ) {
            walkDeps(shrinkwrap, function (node, key, parent) {
                var warns = opts.validators.map(function (f) {
                    return f(node, key, parent);
                }).filter(Boolean);

                if (warns.length) {
                    warnings = warnings.concat(warns);
                }
            });
        }

        callback(null, warnings);
    }
}

module.exports = npmShrinkwrap;

/*  you cannot call `npm.load()` twice with different prefixes.
    
    The only fix is to clear the entire node require cache and
      get a fresh duplicate copy of the entire npm library
*/
function getNPM() {
    Object.keys(require.cache).forEach(function (key) {
        delete require.cache[key];
    });
    var NPM = require('npm');
    return NPM;
}

function NPMError(pkginfo) {
    var err = new Error('Problems were encountered\n' +
        'Please correct and try again.\n' +
        pkginfo.problems.join('\n'));
    err.pkginfo = pkginfo;
    return err;
}
