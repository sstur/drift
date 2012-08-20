(function() {
  "use strict";

  var fs = require('fs');
  var path = require('path');
  var watch = require('watch');

  //to suppress warning
  path.exists = fs.exists;

  var cwd = process.cwd();
  var join = path.join;
  var basename = path.basename;
  var config = fs.readFileSync(join(__dirname, 'config.json'), 'utf8');
  config = JSON.parse(config);

  config.watch.forEach(function(opts) {
    opts.ignoreDotFiles = (opts.ignoreDotFiles !== false);
    opts.ignoreUnderscore = (opts.ignoreUnderscore !== false);

    var paths = Array.isArray(opts.paths) ? opts.paths : String(opts.paths).split('|');
    var pathCount = 0, next = function() { if (++pathCount == paths.length) done() };
    var fileCount = 0, log = [];

    if (opts.exclude || opts.mask || opts.ignoreUnderscore) {
      var exPaths = Array.isArray(opts.exclude) ? opts.exclude : [];
      exPaths = exPaths.map(function(path) {
        //ensure one trailing slash
        return path.replace(/\/$/, '') + '/';
      });
      var mask = opts.mask ? maskToRegExp(opts.mask) : false;
      if (mask) log.push(opts.mask + ' -> ' + mask.toString());
      opts.filter = function(path, stat) {
        //return true to exclude
        var excluded = false;
        if (opts.ignoreUnderscore && basename(path).charAt(0) == '_') {
          excluded = true;
        } else
        if (stat.isDirectory()) {
          //add trailing slash
          var dir = path + '/';
          excluded = exPaths.reduce(function(abort, path) {
            return abort || (dir.indexOf(path) == 0);
          }, false);
        } else {
          excluded = mask && !mask.test(path);
          //if (excluded) console.log('(' + mask.toString() + ').test("' + path + '") = ' + !excluded);
        }
        if (excluded) log.push('exclude: ' + path);
        return excluded;
      };
    }

    var handler = function(file, curr, prev) {
      if (typeof file == "object" && prev == null && curr == null) {
//        console.log('fileCount: ' + fileCount + ' for ' + paths.join('; '));
        fileCount += Object.keys(file).length;
        next();
      } else
      if (prev == null) {
        console.log('created:', file);
      } else
      if (curr.nlink == 0) {
        console.log('removed:', file);
      } else {
        console.log('changed:', file);
      }
    };

    var done = function() {
      log.forEach(function(line) { console.log(line) });
      console.log('Watching ' + fileCount + ' items.');
      console.log('------');
    };

    paths.forEach(function(path) {
      path = (path.charAt(0) == '.') ? path : './' + path;
      log.push('watch path: ' + path);
      watch.watchTree(path, opts, handler);
    });

  });

  function maskToRegExp(mask) {
    var masks = mask.split(/;\s*/), exts = [];
    masks.forEach(function(mask) {
      var match = mask.match(/^\*\.([\w-]+)$/);
      if (match) {
        exts.push(match[1]);
      }
    });
    return new RegExp('\\.(' + exts.join('|') + ')$', 'i');
  }

})();