/*global app, define */
(function() {

  global.console = {
    log: function() {
      var args = toArray(arguments);
      app.messenger.send('log', {args: args});
    }
  };

  global.mappath = function(path) {
    var wsh = global['WScript'];
    var fullpath = String(wsh.scriptFullName);
    fullpath = fullpath.replace(/[^\\]+\\build\\.*$/, '');
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