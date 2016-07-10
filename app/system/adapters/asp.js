/*global app, iis */
/* eslint-disable one-var */
var console, Buffer; // eslint-disable-line no-unused-vars

//this is outside the closure so it gets hoisted
function getEnv() {
  return (iis.server.scriptTimeout == 91) ? 'development' : 'production';
}

(function(require) {
  'use strict';

  Buffer = global.Buffer = require('buffer').Buffer;

  console = global.console = {
    getLog: function() {
      var log = iis.app.contents('~log') || '';
      iis.app.contents.remove('~log');
      return log;
    },
    log: function() {
      var args = toArray(arguments).map(function(arg) {
        return isPrimitive(arg) ? String(arg) : util.inspect(arg);
      });
      var log = iis.app.contents('~log') || '';
      log = log ? '\n' + args.join(' ') : args.join(' ');
      iis.app.contents('~log')/*@cc_on@if(0)*/[0]/*@end@*/ = log;
    }
  };

  var util = require('util');
  var Request = require('adapter-request');
  var Response = require('adapter-response');

  //filesystem path including trailing slash
  var basePath = iis.server.mappath('/') + '\\';

  app.mappath = function(path) {
    var fullpath = basePath;
    fullpath = fullpath + String(path).replace(/\//g, '\\');
    fullpath = fullpath.replace(/\\+/g, '\\');
    fullpath = fullpath.replace(/^\\/g, '\\\\');
    fullpath = fullpath.replace(/\\$/g, '');
    return fullpath;
  };

  app.debug = function() {
    var output = [], inspect = require('inspector').inspect; // eslint-disable-line no-mixed-requires
    for (var i = 0, len = arguments.length; i < len; i++) {
      var value = arguments[i];
      output.push(Object(value) === value ? inspect(value) : String(value));
    }
    throw new Error('>>>>\n' + output.join('\n\n'));
  };

  app.data = function(n, val) {
    if (arguments.length == 2) {
      var str = (val == null) ? '' : util.stringify(val);
      iis.app.contents('JSON:' + n)/*@cc_on@if(0)*/[0]/*@end@*/ = str;
      return val;
    } else {
      val = iis.app.contents('JSON:' + n);
      return (val) ? util.parse(val) : '';
    }
  };

  var req = new Request();
  var res = new Response();
  //cross-reference adapter-request and adapter-response
  req.res = res;
  res.req = req;
  if (getEnv() === 'development' && req.getMethod() === 'GET' && req.getURL() === '/~log') {
    res.writeHead('200', 'OK', {'Content-Type': 'text/plain'});
    res.write(console.getLog());
    res.end();
  }
  app.emit('init', require);
  app.emit('ready', require);

  app.route(req, res);
  throw new Error('Router returned without ending request');

})(app.require);
