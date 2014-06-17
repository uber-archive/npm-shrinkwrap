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

// set keys in an order
function sortedKeys(obj, orderedKeys) {
    var keys = Object.keys(obj).sort();
    var fresh = {};

    orderedKeys.forEach(function (key) {
        if (keys.indexOf(key) === -1) {
            return;
        }

        fresh[key] = obj[key];
    });

    keys.forEach(function (key) {
        if (orderedKeys.indexOf(key) !== -1) {
            return;
        }

        fresh[key] = obj[key];
    });

    return fresh;
}

function recursiveSorted(json) {
    if (!json) {
        return json;
    }

    var deps = json.dependencies;
    if (typeof deps === 'object' && deps !== null) {
        json.dependencies = Object.keys(deps)
            .reduce(function (acc, key) {
                acc[key] = recursiveSorted(deps[key]);
                return acc;
            }, {});
        json.dependencies = sortedObject(json.dependencies);
    }

    return sortedKeys(json, [
        'name',
        'version',
        'from',
        'resolved',
        'npm-shrinkwrap-version',
        'dependencies'
    ]);

}

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

                json = recursiveSorted(json);

                json = replaceFields(json, replacer);

                fs.writeFile(shrinkwrapFile,
                    JSON.stringify(json, null, 2), callback);
            });
        });
    }

    function replaceFields(json, replacer, name) {
        name = name || 'root';

        if (json.from) {
            json.from = replacer.call(json,
                'from', json.from, name);
        }

        if (json.dependencies) {
            Object.keys(json.dependencies)
                .forEach(recurse);
        }

        return json;

        function recurse(name) {
            json.dependencies[name] = replaceFields(
                json.dependencies[name],
                replacer,
                name);
        }
    }

    function fixFromField(opts) {
        var shaIsm = opts.fromUri.hash &&
            opts.fromUri.hash.slice(1);

        // from does not have shaIsm. bail early
        if (!shaIsm) {
            return opts.name + '@' + opts.fromValue;
        }

        var resolvedUri = url.parse(opts.resolvedValue);
        var resolveShaism = resolvedUri.hash &&
            resolvedUri.hash.slice(1);

        // resolved does not have shaIsm. bail early
        if (!resolveShaism) {
            return opts.name + '@' + opts.fromValue;
        }

        // replace the from shaIsm with the resolved shaIsm
        if (shaIsm !== resolveShaism) {
            return opts.name + '@' +
                opts.fromValue.replace(shaIsm, resolveShaism);
        }

        return opts.name + '@' + opts.fromValue;
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
    function replacer(key, value, name) {
        if (key !== 'from') {
            return value;
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

            return fixFromField({
                fromUri: uri,
                name: name,
                fromValue: value,
                resolvedValue: resolved
            });
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

        return fixFromField({
            fromUri: secondUri,
            fromValue: rest,
            name: name,
            resolvedValue: resolved
        });
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

        var data = JSON.stringify(json, null, 2) + '\n';
        fs.writeFile(packageJsonFile, data, callback);
    });
}

