/*global app, define */
(function() {

  global.console = {
    log: function() {
      var args = toArray(arguments);
      app.messenger.send('log', {args: args});
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
    return app.messenger.send('app-data', {name: n, value: val});
  };

  //debug
  app.divide = function(a, b) {
    return app.messenger.send('rpc', {method: 'math.divide', args: [a, b]});
  };

})();