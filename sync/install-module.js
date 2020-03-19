var exec = require('child_process').exec;

var path = require('path');

module.exports = installModule;

/* given a location of node_modules it will try and install the
    named dep into that location.

    Assumes npm.load() was called

*/
function installModule(nodeModules, dep, opts, cb) {
    // Suppress side-effects if running `check`
    if (opts.dry === true) {
        if (dep.correct === false) {
            var folder = path.join(nodeModules, dep.name);
            return cb(null, folder + ' has the wrong version ' + dep.version);
        }
        return cb(null);
    }

    var where = path.join(nodeModules, '..');

    console.log('installing ', where, dep.resolved);
    var cmd = 'npm install ' + dep.resolved;

    if (opts.registry) {
        cmd += ' --registry=' + opts.registry;
    }

    exec(cmd, {
        cwd: where
    }, cb);
}
