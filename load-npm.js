var path = require('path');
var fs = require('fs');
var child = require("child_process");

var ERRORS = require('./errors.js');

/*  you cannot call `npm.load()` twice with different prefixes.
    
    The only fix is to clear the entire node require cache and
      get a fresh duplicate copy of the entire npm library
*/
function loadNPM(useGlobalNPM, opts, cb) {
    Object.keys(require.cache).forEach(function (key) {
        delete require.cache[key];
    });

    if (!useGlobalNPM) {
      require('npm').load(opts, cb);

      return;
    }
    
    child.exec("npm prefix -g", function (error, stdout, stderr) {
      var _err = stderr || error;
      if (_err) {
          // fake error like npm error
          throw ERRORS.NPMError({
              pkginfo: _err,
              problemsText: _err.stack || _err.toString()
          });
      }

      // removing trailing new line
      var prefix = stdout.replace(/\n+$/, "");
      var npmPath = path.join(prefix, "lib/node_modules/npm");
      if (fs.existsSync(npmPath)) {
          require(npmPath).load(opts, cb);
      } else {
          throw new Error("global NPM not found in " + npmPath);
      }
    });
}

module.exports = loadNPM;
