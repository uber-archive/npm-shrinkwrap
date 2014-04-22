module.exports = walkDeps;

function walkDeps(package, fn, key) {
    fn(package, key || package.name);

    Object.keys(package.dependencies || {})
        .forEach(function (key) {
            walkDeps(package.dependencies[key], fn, key);
        });
}
