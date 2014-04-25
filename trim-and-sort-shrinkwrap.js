var fs = require('fs');
var path = require('path');
var url = require('url');
var safeJsonParse = require('safe-json-parse');
var parallel = require('run-parallel');
var sortedObject = require('sorted-object');
var TypedError = require('error/typed');
var readJSON = require('read-json');

var EmptyFile = TypedError({
    message: 'npm-shrinkwrap must not be empty',
    type: 'npm-shrinkwrap.missing'
});

module.exports = trimFrom;

function trimFrom(opts, callback) {
    if (typeof opts === 'string') {
        opts = { dirname: opts };
    }

    var shrinkwrapFile = path.join(opts.dirname, 'npm-shrinkwrap.json');
    var registries = opts.registries || ['registry.npmjs.org'];

    parallel([
        fixShrinkwrap,
        fixPackage.bind(null, opts.dirname)
    ], callback);


    function fixShrinkwrap(callback) {
        fs.readFile(shrinkwrapFile, 'utf8', function (err, file) {
            if (err) {
                return callback(err);
            }

            if (file === '') {
                return callback(EmptyFile());
            }

            safeJsonParse(file, function (err, json) {
                if (err) {
                    return callback(err);
                }

                if (json.dependencies) {
                    json.dependencies = sortedObject(json.dependencies);
                }

                fs.writeFile(shrinkwrapFile,
                    JSON.stringify(json, replacer, 2), callback);
            });
        });
    }

    /* trims the `from` field from `npm-shrinkwrap.json` files.

        The `from` field is likely to change because different npm
            clients do different things and general non determinism.

        The `from` field is not really important since the `resolved`
            and `version` fields are mostly used.

        The only situations in which `from` is used is non npm links
            (i.e. git, git+ssh and https tarbal links) and situations
            where there is no `resolved` field.
    */
    function replacer(key, value) {
        if (key !== 'from') {
            return value;
        }

        if (this.dependencies) {
            this.dependencies = sortedObject(this.dependencies);
        }

        var resolved = this.resolved;

        // if this dependency has no `resolved` field then it's not
        // safe to remove the `from` field since `npm install` will
        // use it.
        if (!resolved) {
            return value;
        }

        var uri = url.parse(value);

        // if it's a `http:` link to registry its safe
        // to remove as `from` is not really used
        if ((uri.protocol === 'http:' || uri.protocol === 'https:') &&
            registries.indexOf(uri.host) !== -1
        ) {
            return undefined;
        // if it's any other link, like `git`, `git+ssh` or a http
        // link to an arbitrary tarball then we cant remove it
        } else if (uri.protocol) {
            // for resolve branches & shaisms to commit shas
            // we should always have `from` contain a git sha
            // because that's consistent

            var shaIsm = uri.hash.slice(1);

            // from does not have shaIsm. bail realy
            if (!shaIsm) {
                return value;
            }

            var resolvedUri = url.parse(resolved);
            var resolveShaism = resolvedUri.hash.slice(1);

            // resolved does not have shaIsm. bail early
            if (!resolveShaism) {
                return value;
            }

            // replace the from shaIsm with the resolved shaIsm
            if (shaIsm !== resolveShaism) {
                return value.replace(shaIsm, resolveShaism);
            }

            return value;
        }

        // otherwise the `value` is in the format `name@semverish`

        var parts = value.split('@');
        var rest = parts.slice(1).join('@');

        // parse the `semverish` part of the `from` field value.
        var secondUri = url.parse(rest);

        // if it's an uri instead of a `semverish` then it's not
        // safe to remove the `from` field
        // However if it is NOT an uri then its safe to remove
        if (!secondUri.protocol) {
            return undefined;
        }

        return value;
    }
}

function fixPackage(dirname, callback) {
    var packageJsonFile = path.join(dirname, 'package.json');
    readJSON(packageJsonFile, function (err, json) {
        if (err) {
            return callback(err);
        }

        if (json.dependencies) {
            json.dependencies = sortedObject(json.dependencies);
        }
        if (json.devDependencies) {
            json.devDependencies = sortedObject(json.devDependencies);
        }

        fs.writeFile(packageJsonFile,
            JSON.stringify(json, null, 2), callback);
    });
}

