(function() {
  "use strict";

  var fs = require('fs');
  var join = require('path').join;
  var Buffer = require('buffer').Buffer;

  try {
    var uglifyjs = require('uglify-js');
  } catch(e) {}

  function uglify(code) {
    //quick hack to remove strict mode declarations
    code = code.replace(/^\s*("|')use strict\1;?\s*$/gm, '');
    var parser = uglifyjs.parser;
    var processor = uglifyjs.uglify;
    var ast = parser.parse(code);
    ast = processor.ast_lift_variables(ast);
    ast = processor.ast_mangle(ast, {toplevel: true});
    ast = processor.ast_squeeze(ast);
    return processor.gen_code(ast, {beautify: true, indent_level: 2, ascii_only: true, inline_script: true});
  }

  var REG_NL = /\r\n|\r|\n/g;

  var basePath = __dirname
    , buildPath = join(__dirname, 'app/build');

  var opts = process.argv.slice(2).reduce(function(opts, el) {
    return (opts[el.replace(/^-+/, '')] = 1) && opts;
  }, {});

  var sourceFiles = []
    , sourceLines = [];

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

  sourceLines.push('(function(global) {');

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

  if (opts.m) {
    if (!uglifyjs) {
      console.err('Cannot find module uglify-js.');
      process.exit();
    }
    sourceLines = [uglify(sourceLines.join('\n'))];
  } else
  if (opts.e) {
    //toso: add source-line mapping for error handling
  }

  sourceLines.unshift('<%@LANGUAGE="JAVASCRIPT" CODEPAGE="65001"%>', '<script runat="server" language="javascript">');
  sourceLines.push('</script>');


  //construct buffer including byte-order-mark and source
  var bom = new Buffer('EFBBBF', 'hex'), source = sourceLines.join('\r\n'), sourceLength = Buffer.byteLength(source);
  var buffer = new Buffer(bom.length + sourceLength);
  bom.copy(buffer);
  buffer.write(source, bom.length, sourceLength, 'utf8');
  fs.writeFileSync(join(buildPath, 'app.asp'), buffer);

})();