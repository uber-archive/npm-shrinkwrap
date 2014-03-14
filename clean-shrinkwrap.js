#!/bin/node

var fs = require('fs');
var path = require('path');

var shrinkwrapFile = path.resolve('npm-shrinkwrap.json');
var file = JSON.parse(fs.readFileSync(shrinkwrapFile));
var url = require('url');

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

    var resolved = this.resolved;

    // if this dependency has no `resolved` field then it's not
    // safe to remove the `from` field since `npm install` will
    // use it.
    if (!resolved) {
        return value;
    }

    var uri = url.parse(value);

    // if it's a `http:` link to `{{private registry}}` its safe
    // to remove as `from` is not really used
    if (uri.protocol === 'http:' &&
        uri.host === '{{private registry}}'
    ) {
        return undefined;
    // if it's any other link, like `git`, `git+ssh` or a http
    // link to an arbitrary tarball then we cant remove it
    } else if (uri.protocol) {
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

fs.writeFileSync(shrinkwrapFile, JSON.stringify(file, replacer, 2));
