/*global app, define */
var console, Buffer;
(function(require) {

  var util = require('util');

  console = global.console = {
    log: function() {
      var args = toArray(arguments);
      for (var i = 0; i < args.length; i++) {
        args[i] = util.inspect(args[i]);
      }
      app.messenger.send('log', args);
    }
  };

  Buffer = global.Buffer = require('buffer').Buffer;

  app.mappath = function(path) {
    var fullpath = global.basePath + 'app\\';
    fullpath = fullpath + String(path).replace(/\//g, '\\');
    fullpath = fullpath.replace(/[\\]+/g, '\\');
    fullpath = fullpath.replace(/\\$/g, '');
    return fullpath;
  };

  app.data = function(n, val) {
    return app.messenger.query('app-data', {name: n, value: val});
  };

  app.rpc = function(method /*, args */) {
    var args = Array.prototype.slice.call(arguments, 1);
    return app.messenger.query('rpc', {method: method, args: args});
  };

})(app.require);