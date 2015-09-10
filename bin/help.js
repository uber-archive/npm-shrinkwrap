var path = require('path');
var fs = require('graceful-fs');
var msee = require('msee');
var template = require('string-template');

function printHelp(opts) {
    opts = opts || {};

    var loc = path.join(__dirname, 'usage.md');
    var content = fs.readFileSync(loc, 'utf8');

    content = template(content, {
        cmd: opts.cmd || 'npm-shrinkwrap'
    });

    if (opts.h) {
        content = content.split('##')[0];
    }

    var text = msee.parse(content, {
        paragraphStart: '\n'
    });

    return console.log(text);
}

module.exports = printHelp;
