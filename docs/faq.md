# FAQ

## How do I use validators

Validators are an array of functions.

Each one gets called with a package in the shrinkwrap. You
can do a custom validation check for the package.

Either return an error or null.

```js
var npmShrinkwrap = require('npm-shrinkwrap/bin/cli');
var TypedError = require('error/typed');

var MissingResolved = TypedError({
    type: 'missing.resolved.field',
    message: 'Expected dependency {name}@{version} to ' +
        'have a resolved field.\n Instead found a ' +
        'from field {from}.\n Invalid dependency is found ' +
        'at path {path}'
});

var InvalidGitDependency = TypedError({
    type: 'invalid.git.dependency',
    message: 'Unexpected usage of invalid Git dependency.\n ' +
        'Expected dependency {name}@{version} to not be ' +
        'resolved to {resolved}.\n Please install again ' +
        'from the gitolite mirror.\n Invalid dependency ' +
        'is found at path {path}'
});

npmShrinkwrap({
    validators: [
        assertResolved,
        assertNotGithub
    ]
});

function assertResolved(package, name) {
    if (typeof package.from === 'string' &&
        typeof package.resolved !== 'string'
    ) {
        return MissingResolved({
            name: name,
            resolved: package.resolved,
            from: package.from,
            version: package.version,
            path: computePath(package)
        });
    }

    return null;
}

function assertNotGithub(package, name) {
    if (package.resolved &&
        package.resolved.indexOf('git@github.com') !== -1
    ) {
        return InvalidGitDependency({
            name: name,
            version: package.version,
            resolved: package.resolved,
            from: package.from,
            path: computePath(package)
        });
    }

    return null;
}
```
