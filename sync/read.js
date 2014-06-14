var path = require('path');
var readJSON = require('read-json');

module.exports = {
    shrinkwrap: readShrinkwrap,
    package: readPackage,
    devDependencies: readDevDependencies
};

function readPackage(dirname, cb) {
    var uri = path.join(dirname, 'package.json');
    readJSON(uri, cb);
}

function readShrinkwrap(dirname, cb) {
    var uri = path.join(dirname, 'npm-shrinkwrap.json');
    readJSON(uri, cb);
}

function readDevDependencies(dirname, cb) {
    readPackage(dirname, function (err, json) {
        if (err) {
            return cb(err);
        }

        cb(null, json.devDependencies);
    });
}
