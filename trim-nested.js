var jsonDiff = require('json-diff');

module.exports = trimNested;

/*  var patches = diff(current, previous)

    for each NESTED (depth >=1) patch, apply it to current.

    Write new current into disk at dirname/npm-shrinkwrap.json

*/
function trimNested(previous, current, opts) {
    // bail early if we want to keep nested dependencies
    if (opts.keepNested) {
        return current;
    }

    // purposes find patches from to
    // apply TO current FROM previous
    var patches = jsonDiff.diff(current, previous);

    if (!patches) {
        return current;
    }

    patches = removeTopLevelPatches(patches);

    if (patches.dependencies) {
        Object.keys(patches.dependencies)
            .forEach(function (key) {
                current.dependencies[key] =
                    previous.dependencies[key];
            });
    }

    return current;
}

function removeTopLevelPatches(patches) {
    if (!patches.dependencies) {
        return patches;
    }

    patches.dependencies = Object.keys(patches.dependencies)
        .reduce(function (acc, key) {
            var patch = patches.dependencies[key];

            if (typeof patch !== 'object' || patch === null) {
                return acc;
            }

            var patchKeys = Object.keys(patch);

            if (patchKeys.length === 1 &&
                patchKeys[0] === 'dependencies'
            ) {
                acc[key] = patch;
            }
            return acc;
        }, {});

    return patches;
}
