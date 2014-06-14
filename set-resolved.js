var path = require('path');
var fs = require('fs');
var template = require('string-template');
var readJSON = require('read-json');
var url = require('url');
var semver = require('semver');
var TypedError = require('error/typed');

var version = require('./package.json').version;

var NPM_URI = 'https://registry.npmjs.org/{name}/-/{name}-{version}.tgz';
var INVALID_VERSION = TypedError({
    message: 'Using an older version of npm-shrinkwrap.\n' +
        'Expected version {existing} but found {current}.\n' +
        'To fix: please run `npm install npm-shrinkwrap@{existing}`\n'
});

module.exports = setResolved;

function defaultCreateUri(name, version) {
    return template(NPM_URI, {
        name: name,
        version: version
    });
}

/*  from field is either:
     - {name}@{semverRange}
     - {name}@{gitUri}
     - {privateRegistryUri}

*/
function setResolved(opts, callback) {
    if (typeof opts === 'string') {
        opts = { dirname: opts };
    }

    var shrinkwrapFile = path.join(opts.dirname, 'npm-shrinkwrap.json');
    var createUri = opts.createUri || defaultCreateUri;
    var registries = opts.registries || ['registry.npmjs.org'];
    var rewriteResolved = opts.rewriteResolved || null;

    readJSON(shrinkwrapFile, onjson);

    function onjson(err, json) {
        if (err) {
            return callback(err);
        }

        var existingVersion = json['npm-shrinkwrap-version'];

        if (existingVersion && semver.gt(existingVersion, version)) {
            return callback(INVALID_VERSION({
                existing: existingVersion,
                current: version
            }));
        }

        json['npm-shrinkwrap-version'] = version;

        json = fixResolved(json, null);

        // if top level shrinkwrap has a `from` or `resolved`
        // field then delete them
        if (json.from) {
            json.from = undefined;
        }
        if (json.resolved) {
            json.resolved = undefined;
        }

        fs.writeFile(shrinkwrapFile,
            JSON.stringify(json, null, 2), callback);
    }

    function fixResolved(json, name) {
        if (json.from && !json.resolved) {
            computeResolved(json, name);
        }

        // handle the case of no resolved & no from
        if (json.version && name && !json.resolved) {
            json.resolved = createUri(name, json.version);
        }

        if (rewriteResolved && json.resolved) {
            json.resolved = rewriteResolved(json.resolved);
        }

        if (json.dependencies) {
            Object.keys(json.dependencies).forEach(function (dep) {
                fixResolved(json.dependencies[dep], dep);
            });
            json.dependencies = json.dependencies;
        }

        return json;
    }

    /*  look for `from` fields and set a `resolved` field next
          to it if the `resolved` does not exist.

        This normalizes `npm shrinkwrap` so a resolved field
          always get's set.

    */
    function computeResolved(json, name) {
        var value = json.from;
        name = name || json.name;

        var uri = url.parse(value);

        // handle the case `from` is a privateRegistryURL
        if ((uri.protocol === 'http:' || uri.protocol === 'https:') &&
            registries.indexOf(uri.host) !== -1
        ) {
            json.resolved = value;
            return;
        }

        // from is {name}@{semver | uri}
        var parts = value.split('@');
        var rest = parts.slice(1).join('@');

        var secondUri = url.parse(rest);

        // from is a {name}@{semver}
        if (!secondUri.protocol) {
            // call createUri to generate a tarball uri
            // for json module name & version
            json.resolved = createUri(name, json.version);
            return;
        } else {
            // from is a git link.
            // do not try to set resolved
            return;
        }
    }
}
