/*global app, WScript */
/*jshint evil:true */
var require = app.require, console, Buffer;
(function() {
  Buffer = require('buffer').Buffer;
  var util = require('util');
  var inspect = require('inspector').inspect;

  console = {
    log: function() {
      for (var i = 0, len = arguments.length; i < len; i++) {
        var value = arguments[i], isObject = (Object(value) === value);
        WScript.stdout.writeLine(isObject ? inspect(value) : String(value));
      }
    }
  };

  var basePath = String(WScript.scriptFullName).replace(/[^\\]+\\[^\\]+$/, '');
  app.mappath = function(path) {
    var fullpath = basePath;
    fullpath = fullpath + String(path).replace(/\//g, '\\');
    fullpath = fullpath.replace(/\\+/g, '\\');
    fullpath = fullpath.replace(/^\\/g, '\\\\');
    fullpath = fullpath.replace(/\\$/g, '');
    return fullpath;
  };

  app.debug = function() {
    console.log.apply(console, arguments);
    throw null;
  };

  var data = {};
  app.data = function(n, val) {
    if (arguments.length == 2) {
      var str = (val == null) ? '' : util.stringify(val);
      data['JSON:' + n] = str;
      return val;
    } else {
      val = data['JSON:' + n];
      return (val) ? util.parse(val) : '';
    }
  };

  app.emit('init', require);
  app.emit('ready', require);

  var Request = require('mock-request');
  var Response = require('mock-response');

  var _route = app.route;
  app.route = function(reqData) {
    var req = new Request(reqData);
    var res = new Response();
    try {
      _route.call(app, req, res);
    } catch(e) {
      //if e is null, then the request was handled successfully
      if (e !== null) throw e;
      return res;
    }
  };

})();
//DEBUGGER:try{throw{}}catch(repl){while(repl.line!=".exit"){if(repl.line){delete repl.out;delete repl.err;try{repl.out=eval("("+repl.line+")")}catch(e){if(e instanceof SyntaxError){try{repl.out=eval(repl.line)}catch(e){repl.err=e}}else{repl.err=e}}if(repl.err){console.log("Error: "+repl.err.message)}else{if("out"in repl)console.log(repl.out)}}WScript.stdout.write("debugger> ");repl.line=WScript.stdin.readLine()}}
try {
  throw {};
} catch(repl) {
  while (repl.line != '.exit') {
    if (repl.line) {
      delete repl.out;
      delete repl.err;
      try {
        repl.out = eval('(' + repl.line + ')');
      } catch (e1) {
        if (e1 instanceof SyntaxError) {
          try {
            repl.out = eval(repl.line);
          } catch (e2) {
            repl.err = e2;
          }
        } else {
          repl.err = e1;
        }
      }
      if (repl.err) {
        console.log('Error: ' + repl.err.message);
      } else {
        if ('out' in repl) console.log(repl.out);
      }
    }
    WScript.stdout.write('> ');
    repl.line = WScript.stdin.readLine();
  }
}