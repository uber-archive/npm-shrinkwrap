var path = require('path');
var readJSON = require('read-json');

module.exports = {
    shrinkwrap: readShrinkwrap,
    package: readPackage,
    devDependencies: readDevDependencies
};

function readPackage(dirname, cb) {
    var filePath = path.join(dirname, 'package.json');
    readJSON(filePath, cb);
}

function readShrinkwrap(dirname, cb) {
    var filePath = path.join(dirname, 'npm-shrinkwrap.json');
    readJSON(filePath, cb);
}

function readDevDependencies(dirname, cb) {
    readPackage(dirname, function (err, json) {
        if (err) {
            return cb(err);
        }

        cb(null, json.devDependencies);
    });
}
