var console, Buffer;
(function(require) {
  "use strict";

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

  var server = global['Server'], application = global['Application'];

  //filesystem path including trailing slash
  var basePath = global.basePath = server.mappath('/') + '\\';

  app.mappath = function(path) {
    var fullpath = basePath + 'app\\';
    fullpath = fullpath + String(path).replace(/\//g, '\\');
    fullpath = fullpath.replace(/[\\]+/g, '\\');
    fullpath = fullpath.replace(/\\$/g, '');
    return fullpath;
  };

  app.data = function(n, val) {
    //todo: application(n) = JSON.stringify(val)
    return '';
  };

  app.emit('ready', require);

  app.route(new Request(), new Response());
  throw new Error('Router returned without ending request');

})(app.require);