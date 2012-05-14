(function() {
  var fs = require('fs');

  var writeAll = function(fd, buffer, offset, length, callback) {
    fs.write(fd, buffer, offset, length, offset, function(err, written) {
      if (err) {
        fs.close(fd, function() {
          if (callback) callback(err);
        });
      } else {
        if (written === length) {
          fs.close(fd, callback);
        } else {
          writeAll(fd, buffer, offset + written, length - written, callback);
        }
      }
    });
  };

  var writeFile = function(path, data, opts, callback) {
    callback = (typeof(callback) == 'function' ? callback : null);
    fs.open(path, opts.mode, 438 /*=0666*/, function(err, fd) {
      if (err) {
        if (callback) callback(err);
      } else {
        var buffer = Buffer.isBuffer(data) ? data : new Buffer('' + data, opts.encoding);
        writeAll(fd, buffer, 0, buffer.length, callback);
      }
    });
  };

  var copyFile = function(sourcePath, destPath, callback) {
    var source = fs.createReadStream(sourcePath);
    var dest = fs.createWriteStream(destPath);
    source.on('error', callback);
    source.on('close', function() {
      callback();
    });
    source.pipe(dest);
  };

  module.exports = {
    stat: fs.stat.bind(fs),
    open: fs.open.bind(fs),
    write: fs.write.bind(fs),
    close: fs.close.bind(fs),
    readFile: fs.readFile.bind(fs),
    writeFile: writeFile.bind(fs),
    copyFile: copyFile.bind(fs),
    rename: fs.rename.bind(fs),
    unlink: fs.unlink.bind(fs),
    mkdir: fs.mkdir.bind(fs),
    rmdir: fs.rmdir.bind(fs)
  };
})();