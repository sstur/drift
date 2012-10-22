/*global app */
var console, Buffer;
(function(require) {
  "use strict";

  app.__init = Date.now();

  var util = require('util');
  var Request = require('iis-request');
  var Response = require('iis-response');

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
  var basePath = iis.svr.mappath('/') + '\\';

  app.mappath = function(path) {
    var fullpath = basePath;
    fullpath = fullpath + String(path).replace(/\//g, '\\');
    fullpath = fullpath.replace(/[\\]+/g, '\\');
    fullpath = fullpath.replace(/^\\/g, '\\\\');
    fullpath = fullpath.replace(/\\$/g, '');
    return fullpath;
  };

  app.data = function(n, val) {
    //todo: iis.app(n) = JSON.stringify(val)
    return '';
  };

  app.emit('ready', require);

  app.route(new Request(), new Response());
  throw new Error('Router returned without ending request');

})(app.require);