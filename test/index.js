var rimraf = require('rimraf');
// clean up folder created in previous incomplete test
rimraf('./proj', function() {
  require('./npm-shrinkwrap.js');
  require('./git-https-use-case.js');
});
