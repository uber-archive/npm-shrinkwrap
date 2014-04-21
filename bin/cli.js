#!/usr/bin/env node

var parseArgs = require('minimist');
var path = require('path');

var installModule = require('./install.js');
var printHelp = require('./help.js');
var shrinkwrap = require('../index.js');
var formatters = require('./formatters.js');

module.exports = main;

if (require.main === module) {
    main(parseArgs(process.argv.slice(2)));
}

function main(opts) {
    var command = opts._[0];

    if (opts.h || opts.help || command === 'help') {
        return printHelp(opts);
    }

    opts.dirname = opts.dirname ?
        path.resolve(opts.dirname) : process.cwd();

    opts.warnOnNotSemver = opts.warnOnNotSemver ?
        opts.warnOnNotSemver : true;

    opts.cmd = opts.cmd || 'npm-shrinkwrap';

    if (command === 'install') {
        return installModule(opts, function (err) {
            if (err) {
                throw err;
            }

            console.log('added %s to package.json', opts.cmd);
        });
    }

    shrinkwrap(opts, function (err, warnings) {
        if (err) {
            if (opts.onerror) {
                return opts.onerror(err);
            }

            printWarnings(err);
            console.log('something went wrong. Did not write ' +
                'npm-shrinkwrap.json');
            return process.exit(1);
        }

        if (warnings) {
            if (opts.onwarn) {
                opts.onwarn(warnings);
            } else {
                printWarnings({ errors: warnings });
            }
        }

        if (!opts.silent) {
            console.log('wrote npm-shrinkwrap.json');
        }
    });
}

function printWarnings(err) {
    if (!err.errors) {
        return console.error(err.message);
    }

    err.errors.forEach(function (err) {
        var format = formatters[err.type];

        if (!format) {
            console.error(err.message);
        } else {
            console.error(format(err));
        }
    });
}
