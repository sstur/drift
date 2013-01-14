/*global app, iis */
var console, Buffer;
(function(require) {
  "use strict";

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
    if (arguments.length == 2) {
      var str = (val == null) ? '' : util.stringify(val);
      iis.app('JSON:' + n)/*@cc_on@if(0)*/[0]/*@end@*/ = str;
      return val;
    } else {
      val = iis.app('JSON:' + n);
      return (val) ? util.parse(val) : '';
    }
  };

  app.emit('ready', require);

  app.route(new Request(), new Response());
  throw new Error('Router returned without ending request');

})(app.require);