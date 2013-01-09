/*global process, require, module, exports */
(function() {
  "use strict";

  var fs = require('fs');
  var path = require('path');
  var watchr = require('watchr');

  //to suppress warning
  path.exists = fs.exists;

  var join = path.join;
  var basename = path.basename;

  var basePath = path.dirname(process.argv[1]);

  var config = fs.readFileSync(join(basePath, 'config.json'), 'utf8');
  config = JSON.parse(config);

  function itemCreated(file, stat) {
    console.log('created:', file);
  }

  function itemRemoved(file, stat) {
    console.log('removed:', file);
  }

  function itemChanged(file, newStat, oldStat) {
    console.log('changed:', file);
  }

  config.watch.forEach(function(opts) {
    opts.ignoreDotFiles = (opts.ignoreDotFiles !== false);
    opts.ignoreUnderscore = (opts.ignoreUnderscore !== false);

    var paths = Array.isArray(opts.paths) ? opts.paths : String(opts.paths).split('|');
    var pathCount = 0;
    var log = [];

    var filters = [];

    if (opts.mask) {
      opts.mask = maskToRegExp(opts.mask);
      filters.push(function(path) {
        return opts.mask.test(path);
      });
    }

    if (opts.exclude) {
      filters.push(function(path) {
        var exclude = opts.exclude, len = exclude.length;
        for (var i = 0; i < len; i++) {
          var reg = new RegExp('(^|/)' + escRegExp(exclude[i]) + '(/|$)');
          if (reg.test(path)) return false;
        }
        return true;
      });
    }

    if (opts.ignoreDotFiles) {
      filters.push(function(path) {
        return (/(^|\/)\.[^\/]/).test(path) ? false : true;
        //return (path.split('/').pop().charAt(0) == '.') ? false : true;
      });
    }

    if (opts.ignoreUnderscore) {
      filters.push(function(path) {
        return (/(^|\/)_[^\/]/).test(path) ? false : true;
        //return (path.split('/').pop().charAt(0) == '_') ? false : true;
      });
    }

    var checkPath = function(path) {
      for (var i = 0; i < filters.length; i++) {
        if (!filters[i](path)) {
          return false;
        }
      }
      return true;
    };

    var next = function() {
      if (++pathCount == paths.length) {
        done();
      }
    };

    var done = function() {
      log.forEach(function(line) {
        console.log(line)
      });
      console.log('Watching ' + paths.length + ' paths.');
      console.log('------');
    };

    var listener = function(eventName, filePath, fileCurrentStat, filePreviousStat) {
      if (!checkPath(filePath)) return;
      switch (eventName) {
        case 'new':
          itemCreated(filePath, fileCurrentStat, filePreviousStat);
          break;
        case 'change':
          itemChanged(filePath, fileCurrentStat, filePreviousStat);
          break;
        case 'unlink':
          itemRemoved(filePath, fileCurrentStat, filePreviousStat);
      }
    };

    paths.forEach(function(path) {
      path = (path.charAt(0) == '.') ? path : './' + path;
      log.push('watch path: ' + path);
      watchr.watch({
        path: path,
        listener: listener,
        next: next
      });
    });

  });

  function escRegExp(str) {
    return String(str).replace(/([.?*+^$\[\]\\(){}-])/g, '\\$1');
  }

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