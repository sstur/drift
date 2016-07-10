/*global global, module */
(function() {
  var fs = require('fs');
  var join = require('path').join;
  var slice = Array.prototype.slice;

  //the parsed cli arguments from optimist
  var opts = global.opts || {};
  //this is the project path; used in patch and app.mappath
  var basePath = global.basePath = opts.path || process.cwd();

  //read one or more config files (if exists) in `path` and aggregate their properties
  function readConfig() {
    var files = slice.call(arguments);
    var results = {};
    files.forEach(function(file) {
      try {
        var data = fs.readFileSync(join(basePath, file), 'utf8');
        data = JSON.parse(data);
      } catch (e) {
        return;
      }
      Object.keys(data).forEach(function(key) {
        results[key] = data[key];
      });
    });
    return results;
  }

  module.exports = readConfig('package.json', 'app-conf.json', 'build-conf.json', 'db-conf.json');

})();
