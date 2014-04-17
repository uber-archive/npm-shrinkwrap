var NPM = require('npm');

var setResolved = require('./set-resolved.js');
var trimFrom = require('./trim-and-sort-shrinkwrap.js');

function npmShrinkwrap(dir, callback) {
    NPM.load({
        prefix: dir
    }, onnpm);

    function onnpm(err, npm) {
        if (err) {
            return callback(err);
        }

        npm.commands.shrinkwrap({}, true, onshrinkwrap);
    }

    function onshrinkwrap(err) {
        if (err) {
            return callback(err);
        }

        setResolved(dir, onResolved);
    }

    function onResolved(err) {
        if (err) {
            return callback(err);
        }

        trimFrom(dir, callback);
    }
}

module.exports = npmShrinkwrap;
