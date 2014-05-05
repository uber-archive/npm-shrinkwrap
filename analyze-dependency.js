var url = require('url');
var TypedError = require('error/typed');
var validSemver = require('semver').valid;
var path = require('path');
var readJSON = require('read-json');

var NoTagError = TypedError({
    type: 'missing.gitlink.tag',
    message: 'Expected the git dependency {name} to have a ' +
        'tag;\n instead I found {gitLink}'
});

var NonSemverTag = TypedError({
    type: 'gitlink.tag.notsemver',
    message: 'Expected the git dependency {name} to have a ' +
        'valid version tag;\n instead I found {tag} for the ' +
        'dependency {gitLink}'
});

var InvalidPackage = TypedError({
    type: 'invalid.packagejson',
    message: 'The package.json for module {name} in your ' +
        'node_modules tree is malformed.\n Expected JSON with ' +
        'a version field and instead got {json}'
});

var InvalidVerson = TypedError({
    type: 'invalid.git.version',
    message: 'The version of {name} installed is invalid.\n ' +
        'Expected {expected} to be installed but instead ' +
        '{actual} is installed.'
});

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
        return cb(null, NoTagError({
            name: name,
            gitLink: gitLink,
            dirname: opts.dirname
        }));
    }

    var version = parseVersion(parsed.tag);

    if (!version) {
        return cb(null, NonSemverTag({
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
            return cb(err);
        }

        if (!pkg || !pkg.version) {
            return cb(null, InvalidPackage({
                name: name,
                gitLink: gitLink,
                json: JSON.stringify(pkg),
                tag: parsed.tag,
                dirname: opts.dirname
            }));
        }

        if (pkg.version !== version) {
            return cb(null, InvalidVerson({
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
