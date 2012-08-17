(function() {
  "use strict";

  var fs = require('fs');
  var join = require('path').join;
  var Buffer = require('buffer').Buffer;

  var REG_NL = /\r\n|\r|\n/g;

  var basePath = __dirname
    , buildPath = join(__dirname, 'app/build');
  var sourceFiles = []
    , sourceLines = ['(function(global) {'];

  var loadFile = function(dir, file) {
    var path = join(dir, file), fullpath = join(basePath, path);
    console.log('load file', path);
    var filedata = fs.readFileSync(fullpath, 'utf8');
    var lines = filedata.split(REG_NL);
    sourceFiles.push({
      path: path,
      fullpath: fullpath,
      lineOffset: sourceLines.length,
      lineCount: lines.length
    });
    sourceLines = sourceLines.concat(lines);
  };

  var loadPath = function(dir) {
    var path = join(basePath, dir);
    var items = fs.readdirSync(path);
    items.forEach(function(item) {
      if (item.charAt(0) == '_') return;
      var fullpath = join(path, item)
        , stat = fs.statSync(fullpath);
      if (stat.isDirectory()) {
        loadPath(join(dir, item));
      } else
      if (stat.isFile() && item.match(/\.js$/i)) {
        loadFile(dir, item);
      }
    });
  };

  //load framework core (instantiates `app` and `define`)
  loadFile('app/system', 'core.js');

  //load shim/patches
  loadPath('app/system/support');
  loadPath('app/system/adapters/shared');
  loadPath('app/system/adapters/activex');

  //load framework modules
  loadPath('app/system/lib');
  loadPath('app/config');
  loadPath('app/controllers');
  loadPath('app/helpers');

  //load adapter specific modules
  loadPath('app/system/adapters/iis');

  //load init script (fires app.ready and notifies us over stdout)
  loadFile('app/system/adapters', 'asp.js');

  sourceLines.push('})({Request: Request, Response: Response, Server: Server, Application: Application})');

  //construct buffer including byte-order-mark and source
  var bom = new Buffer('EFBBBF', 'hex'), source = sourceLines.join('\r\n'), sourceLength = Buffer.byteLength(source);
  var buffer = new Buffer(bom.length + sourceLength);
  bom.copy(buffer);
  buffer.write(source, bom.length, sourceLength, 'utf8');
  fs.writeFileSync(join(buildPath, 'app.js'), buffer);

})();