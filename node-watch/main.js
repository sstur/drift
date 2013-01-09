/*global process, require, module, exports */
(function() {
  "use strict";

  var fs = require('fs');
  var path = require('path');
  var watchr = require('watchr');
  var child_process = require('child_process');

  var join = path.join;

  //var basePath = path.dirname(process.argv[1]);
  var basePath = process.cwd();

  var config = fs.readFileSync(join(basePath, 'watch-conf.json'), 'utf8');
  config = JSON.parse(config);

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
      });
    }

    if (opts.ignoreUnderscore) {
      filters.push(function(path) {
        return (/(^|\/)_[^\/]/).test(path) ? false : true;
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
          console.log('created:', filePath);
          break;
        case 'change':
          console.log('changed:', filePath);
          break;
        case 'unlink':
          console.log('removed:', filePath);
      }
      switch (opts.action.type) {
        case 'exec':
          exec(opts.action.command);
          break;
        case 'kill':
          kill(opts.action.pidfile);
          break;
        case 'mirror':
          //itemChanged(filePath, fileCurrentStat, filePreviousStat);
      }
    };

    paths.forEach(function(path) {
      //path = (path.charAt(0) == '.') ? path : './' + path;
      var fullpath = join(basePath, path);
      log.push('watch path: ' + path);
      watchr.watch({
        path: fullpath,
        listener: listener,
        next: next
      });
    });

  });

  var running = {}, queued = {};

  function exec(cmd) {
    if (cmd in running) {
      queued[cmd] = true;
      return;
    }
    running[cmd] = true;
    console.log('--START EXEC: ' + cmd);
    child_process.exec(cmd, function(err, stdout, stderr) {
      if (err) throw err;
      delete running[cmd];
      console.log(stdout);
      console.log('--EXEC COMPLETED');
      if (queued[cmd]) {
        //files may have changed again during exec
        process.nextTick(function() {
          exec(cmd);
        });
        delete queued[cmd];
      }
    });
  }

  function kill(pid) {
    if (String(pid).match(/\D/)) {
      //pid is a file
      var pidfile = pid;
      fs.readFile(pidfile, 'utf8', function(err, pid) {
        if (err) {
          console.log('--ERROR READING FILE ' + pidfile);
        } else {
          kill(pid.trim());
        }
      });
      return;
    }
    try {
      process.kill(pid);
      console.log('--KILLED PROCESS ' + pid);
    } catch(e) {
      console.log('--ERROR KILLING ' + pid);
    }
  }

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