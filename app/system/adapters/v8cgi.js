/*global app, system */
var console, Buffer;
(function(require) {
  "use strict";

  app.__init = Date.now();

  var util = require('util');
  var Request = require('apache-request');
  var Response = require('apache-response');

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

  //filesystem path including trailing slash
  var basePath = system.env['DOCUMENT_ROOT'], sep = (~basePath.indexOf('/')) ? '/' : '\\';
  if (basePath.slice(-1) != sep) basePath += sep;

  app.mappath = function(path) {
    var fullpath = basePath + 'app' + sep;
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
    app.route(new Request(), new Response());
  } catch(e) {
    if (e) throw e;
  }

})(app.require);