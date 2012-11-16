/*global app, system */
var console, Buffer, _require = function(path) { return require(path); };
(function(require) {
  "use strict";

  app.__init = Date.now();

  Buffer = require('buffer').Buffer;

  console = {
    _log: [],
    log: function() {
      var args = toArray(arguments);
      for (var i = 0; i < args.length; i++) {
        args[i] = util.inspect(args[i]);
      }
      console._log.push(args);
    }
  };

  var util = require('util');
  var Request = require('adapter-request');
  var Response = require('adapter-response');

  //filesystem path including trailing slash
  var basePath = system.env['DOCUMENT_ROOT'], sep = (~basePath.indexOf('/')) ? '/' : '\\';
  if (basePath.slice(-1) != sep) basePath += sep;

  app.mappath = function(path) {
    var fullpath = basePath;
    fullpath = fullpath + String(path).replace(/\//g, sep);
    fullpath = fullpath.split(sep + sep).join(sep);
    return (fullpath.slice(-1) == sep) ? fullpath.slice(0, -1) : fullpath;
  };

  app.data = function(n, val) {
    //todo: use sqlite
    return '';
  };

  app.emit('ready', require);

  try {
    var req = new Request(), res = new Response();
    app.route(req, res);
  } catch(e) {
    //if e is 0, then the request was handled successfully
    if (!e) return;
    if (typeof map == 'undefined') {
      throw e;
    } else {
      handleError(e);
    }
  }


  function adjustError(line) {
    var err = {};
    for (var i = 0; i < map.length; i++) {
      var source = map[i];
      if (line < source.lineOffset + source.lineCount) {
        err.file = source.path;
        err.line = line - source.lineOffset;
        break;
      }
    }
    return err;
  }

  function handleError(err) {
    var stack = err.stack.split(/\r\n|\r|\n/);
    stack = stack.map(function(line) {
      var m = line.match(/^( {4}.*?)\(?\S*\.sjs:(\d+):(\d+)\)?$/);
      if (m) {
        var details = adjustError(+m[2]);
        line = details.file ? m[1] + '(' + details.file + ':' + details.line + ':' + m[3] + ')' : '';
      }
      return line;
    });
    res.clear();
    res.write(stack.join('\r\n'));
    try {
      res.end();
    } catch(e) {}
  }

})(app.require);