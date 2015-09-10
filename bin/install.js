var path = require('path');
var readJSON = require('../read-json');
var fs = require('graceful-fs');
var template = require('string-template');

var version = require('../package.json').version;

var shrinkwrapCommand = '{cmd}';

module.exports = installModule;

function installModule(opts, callback) {
    var file = path.join(opts.dirname, 'package.json');

    opts.packageVersion = opts.packageVersion || '^' + version;
    opts.moduleName = opts.moduleName || 'npm-shrinkwrap';

    readJSON(file, function (err, package) {
        if (err) {
            return callback(err);
        }

        package.scripts = package.scripts || {};

        package.scripts.shrinkwrap =
            template(shrinkwrapCommand, opts);

        if (!opts.onlyScripts) {
            package.devDependencies =
                package.devDependencies || {};
            package.devDependencies[opts.moduleName] =
                opts.packageVersion;
        }

        fs.writeFile(file, JSON.stringify(package, null, 2) + '\n',
            'utf8', callback);
    });
}
