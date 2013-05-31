/*global app, WScript */
var require = app.require, console, Buffer;
(function() {
  Buffer = require('buffer').Buffer;
  var inspect = require('inspector').inspect;
  console = {
    log: function() {
      for (var i = 0; i < arguments.length; i++) {
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
})();
try {
  throw {};
} catch(repl) {
  while (repl.line != '.exit') {
    if (repl.line) {
      repl.err = null;
      try {
        repl.out = eval('(' + repl.line + ')');
      } catch (e) {
        if (e instanceof SyntaxError) {
          try {
            repl.out = eval(repl.line);
          } catch (e) {
            repl.err = e;
          }
        } else {
          repl.err = e;
        }
      }
      if (repl.err) {
        console.log('Error: ' + repl.err.message);
      } else {
        console.log(repl.out);
      }
    }
    WScript.stdout.write('> ');
    repl.line = WScript.stdin.readLine();
  }
}