var url = require('url');
var validSemver = require('semver').valid;
var path = require('path');
var readJSON = require('read-json');

var errors = require('./errors.js');

module.exports = analyzeDependency;
/*

    for each dependency in package.json

        - if not git then skip
        - if no # tag then throw
        - if # is not `v{version}` then throw
        - load up `require(name/package.json).version`
        - if version in node_modules not same in SHA then throw

    Support

        - git://github.com/user/project.git#commit-is  h
        - git+ssh://user@hostname:project.git#commit-ish
        - git+ssh://user@hostname/project.git#commit-ish
        - git+http://user@hostname/project/blah.git#commit-ish
        - git+https://user@hostname/project/blah.git#commit-ish
        - user/name#commit-ish (github)
*/

function analyzeDependency(name, gitLink, opts, cb) {
    var parsed = parseTag(gitLink);

    if (!parsed) {
        return cb(null);
    }

    if (!parsed.tag) {
        return cb(null, errors.NoTagError({
            name: name,
            gitLink: gitLink,
            dirname: opts.dirname
        }));
    }

    var version = parseVersion(parsed.tag);

    if (!version) {
        return cb(null, errors.NonSemverTag({
            name: name,
            gitLink: gitLink,
            tag: parsed.tag,
            dirname: opts.dirname
        }));
    }

    var packageUri = path.join(opts.dirname, 'node_modules',
        name, 'package.json');
    readJSON(packageUri, function (err, pkg) {
        if (err) {
            if (err.code === 'ENOENT') {
                return cb(null, errors.MissingPackage({
                    name: name,
                    expected: version,
                    dirname: opts.dirname,
                    tag: parsed.tag
                }));
            }

            return cb(err);
        }

        if (!pkg || !pkg.version) {
            return cb(null, errors.InvalidPackage({
                name: name,
                gitLink: gitLink,
                json: JSON.stringify(pkg),
                tag: parsed.tag,
                dirname: opts.dirname
            }));
        }

        if (pkg.version !== version) {
            return cb(null, errors.InvalidVersion({
                name: name,
                expected: version,
                actual: pkg.version,
                gitLink: gitLink,
                tag: parsed.tag,
                dirname: opts.dirname
            }));
        }

        return cb(null);
    });
}

function parseTag(value) {
    var uri = url.parse(value);

    if (isGitUrl(uri)) {
        return {
            tag: uri.hash ? uri.hash.substr(1) : null
        };
    }

    // support github
    var parts = value.split('/');
    if (parts.length === 2) {
        var tag = parts[1].split('#')[1];

        return { tag: tag || null };
    }

    return null;
}

function isGitUrl (url) {
    switch (url.protocol) {
        case "git:":
        case "git+http:":
        case "git+https:":
        case "git+rsync:":
        case "git+ftp:":
        case "git+ssh:":
            return true;
    }
}

function parseVersion(tag) {
    var char = tag[0];

    if (char !== 'v') {
        return null;
    }

    var rest = tag.substr(1);
    var isValid = validSemver(rest);

    return isValid ? rest : null;
}
