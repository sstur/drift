/*global process, global, require, exports, module */
var fs = require('fs');
var path = require('path');
var optimist = require('optimist');

var DIRECTIVES = {
  init: './init.js',
  build: './build.js',
  serve: './server.js',
  assemble: assemble,
  restart: restart
};
var directiveList = Object.keys(DIRECTIVES);

//todo: we don't really need optimist here; just use process.argv
var opts = optimist
  .usage('Usage: $0 ' + directiveList.join('|') + ' -p [path]')
  .alias('p', 'path')
  .default('p', process.cwd())
  .argv;

global.opts = opts;

var directive = opts._[0];
if (!(directive in DIRECTIVES)) {
  console.error('You must specify one of the following directives: ' + directiveList.join(', '));
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

function assemble() {
  var assembler = require('assembler');
  //argv should look something like: ["node", "drift", "assemble", "path/to/conf"]
  assembler.exec({
    args: process.argv.slice(3)
  });
}

function restart() {
  try {
    var pid = fs.readFileSync('./server.pid', 'utf8');
  } catch(e) {
    console.error('Unable to read process ID from: ./server.pid');
    process.exit(1);
  }
  if (!pid.match(/^\d+$/)) {
    console.error('Invalid process ID');
    process.exit(1);
  }
  pid = parseInt(pid, 10);
  process.kill(pid, 'SIGHUP');
  console.log('SIGHUP sent to process', pid);
}
