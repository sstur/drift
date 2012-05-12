/*global app, define */
(function() {

  global.console = {
    log: function() {
      var args = toArray(arguments);
      app.messenger.send('log', args);
    }
  };

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

})();