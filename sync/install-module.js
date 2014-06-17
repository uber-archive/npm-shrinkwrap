var path = require('path');

module.exports = installModule;

/* given a location of node_modules it will try and install the
    named dep into that location.

    Assumes npm.load() was called

*/
function installModule(nodeModules, dep, opts, cb) {
    // must lazy require npm or it breaks with the npm.load() order
    var install = require('npm/lib/install.js');

    var where = path.join(nodeModules, '..');

    console.log('installing ', where, dep.resolved);

    // console.log('dep', where, dep.resolved);
    install(where, [
        dep.resolved
    ], cb);
}
