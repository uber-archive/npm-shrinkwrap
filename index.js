var setResolved = require('./set-resolved.js');
var trimFrom = require('./trim-and-sort-shrinkwrap.js');

function npmShrinkwrap(dir, callback) {
    getNPM().load({
        prefix: dir
    }, onnpm);

    function onnpm(err, npm) {
        if (err) {
            return callback(err);
        }

        // when running under `npm test` depth is set to 1
        // reset it to a high number like 100
        npm.config.set('depth', 100);

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

/*  you cannot call `npm.load()` twice with different prefixes.
    
    The only fix is to clear the entire node require cache and
      get a fresh duplicate copy of the entire npm library
*/
function getNPM() {
    Object.keys(require.cache).forEach(function (key) {
        delete require.cache[key];
    });
    var NPM = require('npm');
    return NPM;
}
