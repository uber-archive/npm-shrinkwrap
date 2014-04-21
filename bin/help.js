var path = require('path');
var fs = require('fs');
var msee = require('msee');
var template = require('string-template');

function printHelp(opts) {
    opts = opts || {};

    var loc = path.join(__dirname, 'usage.md');
    var content = fs.readFileSync(loc, 'utf8');

    content = template(content, {
        cmd: opts.cmd || 'npm-shrinkwrap'
    });

    return console.log(msee.parse(content, {
        paragraphStart: '\n'
    }));
}

module.exports = printHelp;
