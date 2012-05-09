(function() {
  "use strict";

  var fs = require('fs');
  var join = require('path').join;

  var REG_NL = /\r\n|\r|\n/g;

  var basePath = join(__dirname, '..');
  var sourceFiles, sourceLines, offset = 4;

  var loadFile = function(dir, file) {
    var path = join(dir, file), fullpath = join(basePath, path);
    console.log('load file', path);
    var filedata = fs.readFileSync(fullpath, 'utf8');
    var lines = filedata.split(REG_NL);
    sourceFiles.push({
      path: path,
      fullpath: fullpath,
      lineOffset: offset + sourceLines.length,
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

  exports.build = function(outfile) {
    sourceFiles = [];
    sourceLines = [];

    //load framework core (instantiates `app` and `define`)
    loadFile('app/system', 'core.js');

    //load shim/patches
    loadPath('app/system/support');

    //load framework modules
    loadPath('app/system/lib');
    loadPath('app/controllers');

    //load adapter specific modules
    loadPath('node-wsh/wsh_modules');

    //add header
    sourceLines.splice.call(sourceLines, 0, 0,
        '<?xml version="1.0" encoding="utf-8"?>',
        '<package>',
        '<job>',
        '<script language="javascript">//<![CDATA[');

    sourceLines.push('//]]><\/script>');
    sourceLines.push('</job>');
    sourceLines.push('</package>');

    //todo: make buffer from sourceLines and add bom
    fs.writeFileSync(join(__dirname, outfile), sourceLines.join('\r\n'));

    return sourceFiles;


    //var lines = [
    //  '<?xml version="1.0" encoding="utf-8"?>',
    //  '<package>',
    //  '<job>',
    //  '<script language="javascript">',
    //  '<\/script>',
    //  '</job>',
    //  '</package>'];

  };


})();