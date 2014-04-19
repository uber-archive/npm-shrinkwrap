var ValidationError = require('error/validation');
var find = require('array-find');
var template = require('string-template');

var setResolved = require('./set-resolved.js');
var trimFrom = require('./trim-and-sort-shrinkwrap.js');
var verifyGit = require('./verify-git.js');

function npmShrinkwrap(opts, callback) {
    if (typeof opts === 'string') {
        opts = { dirname: opts };
    }

    getNPM().load({
        prefix: opts.dirname
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

        setResolved(opts, onResolved);
    }

    function onResolved(err) {
        if (err) {
            return callback(err);
        }

        trimFrom(opts, ontrim);
    }

    function ontrim(err) {
        if (err) {
            return callback(err);
        }

        verifyGit(opts, onverify);
    }

    function onverify(err, errors) {
        if (err) {
            return callback(err);
        }

        if (errors.length === 0) {
            return callback(null);
        }

        var error = ValidationError(errors);
        var invalid = find(errors, function (error) {
            return error.type === 'invalid.git.version';
        });

        if (invalid) {
            var msg = 'Problems were encountered\n' +
                'Please correct and try again\n' +
                'invalid: {name}@{actual} {dirname}/node_modules/{name}';
            error.message = template(msg, invalid);
        }

        callback(error);
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
