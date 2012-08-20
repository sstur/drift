(function() {
  "use strict";

  var fs = require('fs');
  var path = require('path');
  var stalker = require('stalker');

  //to suppress warning
  path.exists = fs.exists;

  var cwd = process.cwd();
  var join = path.join;
  var config = fs.readFileSync(join(__dirname, 'config.json'), 'utf8');
  config = JSON.parse(config);

  config.watch.forEach(function(opts) {
    var buffer = opts.buffer || 100, filter;

    if (opts.exclude || opts.mask) {
      var exclude = Array.isArray(opts.exclude) ? opts.exclude : [];
      exclude = exclude.map(function(path) {
        return join(cwd, path).replace(/\\/g, '/').replace(/\/$/, '') + '/';
      });
      var mask = opts.mask ? maskToRegExp(opts.mask) : /.*/;
      filter = function(path) {
        var excluded = exclude.reduce(function(abort, test) {
          return abort || (path.indexOf(test) == 0);
        }, false);
        return !excluded && mask.test(path);
      };
    }

    var change = function(err, files) {
      console.log(['change'].concat([].slice.call(arguments)));
      if (err) {
        if (err.code == 'ENOENT') return;
        console.log(JSON.stringify(err));
        throw err;
      }
      files.forEach(function(file) {
        if (filter && !filter(file)) {
          console.log('Ignoring changed file: ' + file);
          return;
        }
        console.log('Changed file: ' + file);
      });
    };

    var remove = function(err, files) {
      console.log(['remove'].concat([].slice.call(arguments)));
      if (err) {
        if (err.code == 'ENOENT') return;
        console.log(JSON.stringify(err));
        throw err;
      }
      files.forEach(function(file) {
        if (filter && !filter(file)) {
          console.log('Ignoring removed file: ' + file);
          return;
        }
        console.log('Removed file: ' + file);
      });
    };

    var paths = Array.isArray(opts.paths) ? opts.paths : String(opts.paths).split('|');
    paths.forEach(function(path) {
      path = (path.charAt(0) == '.') ? path : './' + path;
      console.log('watch path:' + path);
      stalker.watch(path, {buffer: buffer}, change, remove);
    });

    console.log('------');
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