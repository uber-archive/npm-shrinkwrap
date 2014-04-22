module.exports = walkDeps;

function walkDeps(package, fn, key, parent) {
    package._name = key || package.name;
    package._parent = parent || null;
    fn(package, package._name, package._parent);

    Object.keys(package.dependencies || {})
        .forEach(function (key) {
            walkDeps(package.dependencies[key],
                fn, key, package);
        });
}
