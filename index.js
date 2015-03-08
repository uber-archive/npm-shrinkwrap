var ValidationError = require('error/validation');
var find = require('array-find');
var path = require('path');
var fs = require('fs');
var sortedObject = require('sorted-object');
var readJSON = require('read-json');

var setResolved = require('./set-resolved.js');
var trimFrom = require('./trim-and-sort-shrinkwrap.js');
var verifyGit = require('./verify-git.js');
var walkDeps = require('./walk-shrinkwrap.js');
var trimNested = require('./trim-nested.js');
var sync = require('./sync/');
var ERRORS = require('./errors.js');

/*  npm-shrinkwrap algorithm

     - run `npm ls` to verify that node_modules & package.json
        agree.

     - run `verifyGit()` which has a similar algorithm to 
        `npm ls` and will verify that node_modules & package.json
        agree for all git links.

     - read the old `npm-shrinkwrap.json` into memory

     - run `npm shrinkwrap`

     - copy over excess non-standard keys from old shrinkwrap
        into new shrinkwrap and write new shrinkwrap with extra
        keys to disk.

     - run `setResolved()` which will ensure that the new
        npm-shrinkwrap.json has a `"resolved"` field for every
        package and writes it to disk.

     - run `trimFrom()` which normalizes or removes the `"from"`
        field from the new npm-shrinkwrap.json. It also sorts
        the new npm-shrinkwrap.json deterministically then
        writes that to disk

     - run `trimNested()` which will trim any changes in the
        npm-shrinkwrap.json to dependencies at depth >=1. i.e.
        any changes to nested dependencies without changes to
        the direct parent dependency just get deleted

     - run `sync()` to the new `npm-shrinkwrap.json` back into
        the `node_modules` folder


    npm-shrinkwrap NOTES:

     - `verifyGit()` only has a depth of 0, where as `npm ls`
        has depth infinity.

     - `verifyGit()` is only sound for git tags. This means that
        for non git tags it gives warnings / errors instead.

     - `trimFrom()` also sorts and rewrites the package.json
        for consistency

*/

function npmShrinkwrap(opts, callback) {
    if (typeof opts === 'string') {
        opts = { dirname: opts };
    }

    var _warnings = null;
    var _oldShrinkwrap = null;

    getNPM().load({
        prefix: opts.dirname,
        dev: opts.dev,
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
                error = ERRORS.InvalidVersionsNPMError({
                    actual: invalid.actual,
                    name: invalid.name,
                    dirname: invalid.dirname,
                    errors: error.errors
                });
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

        function onfile(err, oldShrinkwrap) {
            if (err) {
                // if no npm-shrinkwrap.json exists then just
                // create one
                npm.commands.shrinkwrap({}, true, onshrinkwrap);
                return;
            }

            _oldShrinkwrap = oldShrinkwrap;

            /* npm.commands.shrinkwrap will blow away any
                extra keys that you set.

                We have to read extra keys & set them again
                after shrinkwrap is done
            */
            var keys = Object.keys(oldShrinkwrap)
                .filter(function (k) {
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

            function onnewfile(err, newShrinkwrap) {
                if (err) {
                    return callback(err);
                }

                keys.forEach(function (k) {
                    if (!newShrinkwrap[k]) {
                        newShrinkwrap[k] = oldShrinkwrap[k];
                    }
                });

                newShrinkwrap = sortedObject(newShrinkwrap);

                var buf = JSON.stringify(newShrinkwrap, null, 2) + '\n';
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

        var fileName = path.join(opts.dirname,
            'npm-shrinkwrap.json');
        readJSON(fileName, function (err, newShrinkwrap) {
            if (err) {
                return callback(err);
            }

            if (_oldShrinkwrap) {
                newShrinkwrap = trimNested(_oldShrinkwrap,
                    newShrinkwrap, opts);
            }

            var buf = JSON.stringify(newShrinkwrap, null, 2) + '\n';
            fs.writeFile(fileName, buf, 'utf8', function (err) {
                if (err) {
                    return callback(err);
                }

                readJSON(fileName, onfinalwrap);
            });
        });
    }

    function onfinalwrap(err, shrinkwrap) {
        if (err) {
            return callback(err);
        }

        sync(opts, function (err) {
            if (err) {
                return callback(err);
            }

            onsync(null, shrinkwrap);
        });
    }

    function onsync(err, shrinkwrap) {
        if (err) {
            return callback(err);
        }

        var warnings = _warnings ? _warnings : [];
        var errors = [];

        if (opts.validators && Array.isArray(opts.validators) &&
            opts.validators.length !== 0
        ) {
            walkDeps(shrinkwrap, function (node, key, parent) {
                var errs = opts.validators.map(function (f) {
                    return f(node, key, parent);
                }).filter(Boolean);

                if (errs.length) {
                    errors = errors.concat(errs);
                }
            });
        }

        if (errors.length) {
            return callback(ValidationError(errors), warnings);
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
    var problemsText = pkginfo.problems.join('\n');

    return ERRORS.NPMError({
        pkginfo: pkginfo,
        problemsText: problemsText
    });
}
