/*global global, module */
(function() {
  var fs = require('fs');
  var join = require('path').join;

  //the parsed cli arguments from optimist
  var opts = global.opts || {};
  //this is the project path; used in patch and app.mappath
  var basePath = global.basePath = opts.path || process.cwd();

  module.exports = readConfig(basePath, 'package.json', 'app-conf.json', 'build-conf.json', 'db-conf.json');

  //read one or more config files (if exists) in `path` and aggregate their properties
  function readConfig() {
    var files = Array.prototype.slice.call(arguments);
    var results = {};
    files.forEach(function(file) {
      try {
        var data = fs.readFileSync(join(basePath, file), 'utf8');
        data = JSON.parse(data);
      } catch(e) {
        return;
      }
      Object.keys(data).forEach(function(key) {
        results[key] = data[key];
      });
    });
    return results;
  }

})();