(function() {
  "use strict";

  var fs = require('fs');
  var join = require('path').join;
  var Buffer = require('buffer').Buffer;

  try {
    var uglifyjs = require('uglify-js');
  } catch(e) {}

  function removeStrict(ast) {
    var pro = uglifyjs.uglify;
    var w = pro.ast_walker();
    var handler = function(dir) {
      if (dir == 'use strict') return ['block'];
    };
    //var o = {"string":handler,"num":handler,"name":handler,"toplevel":handler,"block":handler,"splice":handler,"var":handler,"const":handler,"try":handler,"throw":handler,"new":handler,"switch":handler,"break":handler,"continue":handler,"conditional":handler,"assign":handler,"dot":handler,"call":handler,"function":handler,"debugger":handler,"defun":handler,"if":handler,"for":handler,"for-in":handler,"while":handler,"do":handler,"return":handler,"binary":handler,"unary-prefix":handler,"unary-postfix":handler,"sub":handler,"object":handler,"regexp":handler,"array":handler,"stat":handler,"seq":handler,"label":handler,"with":handler,"atom":handler,"directive":handler};
    ast = w.with_walkers({directive: handler}, function() {
      return w.walk(ast);
    });
    return ast;
  }

  function uglify(code, mangle) {
    //quick hack to remove strict mode declarations
    //code = code.replace(/^\s*("|')use strict\1;?\s*$/gm, '');
    var jsp = uglifyjs.parser;
    var pro = uglifyjs.uglify;
    var ast = jsp.parse(code);
    ast = pro.ast_lift_variables(ast);
    var opts = {ascii_only: true, inline_script: true};
    if (mangle) {
      ast = pro.ast_mangle(ast, {toplevel: true});
      ast = pro.ast_squeeze(ast);
    } else {
      ast = removeStrict(ast);
      opts.beautify = true;
      opts.indent_level = 2;
    }
    return pro.gen_code(ast, opts);
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
  sourceLines.push('"use strict";');

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
    var mangle = ('mangle' in opts);
    sourceLines = [uglify(sourceLines.join('\n'), mangle)];
  } else
  if (opts.e) {
    //todo: add source-line mapping for error handling
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