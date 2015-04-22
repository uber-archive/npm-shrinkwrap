#!/usr/bin/env node

var parseArgs = require('minimist');
var path = require('path');

var installModule = require('./install.js');
var printHelp = require('./help.js');
var shrinkwrap = require('../index.js');
var formatters = require('./formatters.js');
var diffShrinkwrap = require('./diff.js');
var syncShrinkwrap = require('../sync/');

main.printWarnings = printWarnings;

module.exports = main;

if (require.main === module) {
    main(parseArgs(process.argv.slice(2)));
}

function main(opts, callback) {
    var command = opts._.shift();

    if (opts.h || opts.help || command === 'help') {
        return printHelp(opts);
    }

    opts.dirname = opts.dirname ?
        path.resolve(opts.dirname) : process.cwd();

    opts.keepNested = 'keep-nested' in opts ?
        !!opts['keep-nested'] : 'keepNested' in opts ?
        !!opts.keepNested : true;

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
    } else if (command === 'diff') {
        return diffShrinkwrap(opts, function (err, diff) {
            if (callback) {
                return callback(err, diff);
            }

            if (err) {
                throw err;
            }

            console.log(diff);
        });
    } else if (command === 'sync') {
        return syncShrinkwrap(opts, function (err) {
            if (callback) {
                return callback(err);
            }

            if (err) {
                console.log('error', err);
                console.error('stack', new Error().stack);
                // console.log('stack.length', err.stack.length);
                // return;
                throw err;
            }

            console.log('synced npm-shrinkwrap.json ' +
                'into node_modules');
        });
    }

    shrinkwrap(opts, function (err, warnings) {
        if (err) {
            if (opts.onerror) {
                return opts.onerror(err);
            }

            if (callback) {
                return callback(err);
            }

            printWarnings(err, formatters);
            console.log('something went wrong. Did not write ' +
                'npm-shrinkwrap.json');
            return process.exit(1);
        }

        if (callback) {
            return callback(null, warnings);
        }

        if (warnings) {
            if (opts.onwarn) {
                opts.onwarn(warnings);
            } else {
                printWarnings({ errors: warnings }, formatters);
            }
        }

        if (!opts.silent) {
            console.log('wrote npm-shrinkwrap.json');
        }
    });
}

function printWarnings(err, formatters) {
    if (!err.errors) {
        return console.error(err.message);
    }

    err.errors.forEach(function (err) {
        var format = formatters[err.type] || formatters.default;

        console.error(format(err));
    });
}
