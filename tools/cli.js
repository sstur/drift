/*global process, global, require, exports, module */
var path = require('path');

var opts = require('optimist')
  .usage('Usage: $0 init|build|serve -p [path]')
  .alias('p', 'path')
  .default('p', process.cwd())
  .argv;

var DIRECTIVES = {
  init: './init.js',
  build: './build.js',
  serve: './server.js',
  assemble: function() {
    var assembler = require('assembler');
    //argv should look something like: ["node", "drift", "assemble", "path/to/conf"]
    assembler.exec({
      args: process.argv.slice(3)
    });
  }
};

global.opts = opts;

var directive = opts._.shift();
if (!(directive in DIRECTIVES)) {
  console.error('You must specify one of the following directives: ' + Object.keys(DIRECTIVES).join(', '));
  process.exit(1);
}

(function() {
  var module = DIRECTIVES[directive];
  var type = typeof module;
  if (type == 'string') {
    require(module);
  } else
  if (type == 'function') {
    module();
  }
})();