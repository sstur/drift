(function() {
  "use strict";

  var fs = require('fs')
    , path = require('path')
    , events = require('events');

  var join = path.join, basename = path.basename;

  function walk(dir, options, callback) {
    if (!callback) {callback = options; options = {};}
    if (!callback.files) callback.files = {};
    if (!callback.pending) callback.pending = 0;
    callback.pending += 1;
    fs.stat(dir, function(err, stat) {
      if (err) return callback(err);
      callback.files[dir] = stat;
      fs.readdir(dir, function(err, items) {
        if (err) return callback(err);
        callback.pending -= 1;
        items.forEach(function(f, index) {
          f = join(dir, f);
          callback.pending += 1;
          fs.stat(f, function(err, stat) {
            var enoent = false;
            if (err) {
              if (err.code !== 'ENOENT') {
                return callback(err);
              } else {
                enoent = true;
              }
            }
            callback.pending -= 1;
            if (!enoent) {
              if (options.ignoreDotFiles && basename(f)[0] === '.') return;
              if (options.filter && options.filter(f, stat)) return;
              callback.files[f] = stat;
              if (stat.isDirectory()) walk(f, options, callback);
              if (callback.pending === 0) callback(null, callback.files);
            }
          });
        });
        if (callback.pending === 0) callback(null, callback.files);
      });
      if (callback.pending === 0) callback(null, callback.files);
    });

  }

  var fileWatcher = function(items, f, stat, callback) {
    if (stat.isDirectory()) {
      var watcher = fs.watch(f, opts, function(event, filename) {
        console.log('dir: ' + f + '; event: ' + event + '; filename: ' + filename);
        if (filename) {
          //we can fire the event
        } else {
          //must walk dir and compare to last walk
        }
      });
      //todo: watcher.close()
      fs.readdir(f, function(err, children) {
        if (err) return;
        children.forEach(function(child) {
          var path = join(f, child);
          if (!items[path]) {
            fs.stat(path, function(err, stat) {
              callback(path, stat, null);
              items[path] = stat;
              fileWatcher(items, path, stat, callback);
            });
          }
        });
      });
    }
    if (0) {
      fs.watchFile(f, options, function(c, p) {
        // Check if anything actually changed in stat
        if (items[f] && !items[f].isDirectory() && c.nlink !== 0 && items[f].mtime.getTime() == c.mtime.getTime()) {
          return;
        }
        items[f] = c;
        if (!items[f].isDirectory()) {
          callback(f, c, p);
        } else {
          fs.readdir(f, function(err, children) {
            if (err) return;
            children.forEach(function(child) {
              var file = join(f, child);
              if (!items[file]) {
                fs.stat(file, function(err, stat) {
                  callback(file, stat, null);
                  items[file] = stat;
                  fileWatcher(items, file, stat, callback);
                });
              }
            });
          });
        }
        if (c.nlink === 0) {
          // unwatch removed files.
          delete items[f];
          fs.unwatchFile(f);
        }
      });
    }
  };

  exports.watchTree = function(root, options, callback) {
    if (!callback) {callback = options; options = {};}
    fs.stat(root, function(err, stat) {
      if (err) return callback(err);
      fileWatcher({}, root, stat, callback);
      walk(root, options, function(err, items) {
        if (err) throw err;
        for (var i in items) {
          fileWatcher({}, i, items[i], callback);
        }
        callback(items, null, null);
      });
    });
  };

  exports.createMonitor = function(root, options, cb) {
    if (!cb) {cb = options; options = {};}
    var monitor = new events.EventEmitter();
    exports.watchTree(root, options, function(f, curr, prev) {
      if (typeof f == "object" && prev == null && curr === null) {
        monitor.files = f;
        return cb(monitor);
      }
      if (prev === null) {
        return monitor.emit("created", f, curr);
      }
      if (curr.nlink === 0) {
        return monitor.emit("removed", f, curr);
      }
      monitor.emit("changed", f, curr, prev);
    });
  };

  exports.walk = walk;
  
})();