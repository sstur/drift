/**
 * Build and optionally uglify/mangle the entire application to
 * one platform-specific script file.
 *
 * todo: jscript conditional comments get removed by uglify
 */
(function() {
  "use strict";

  var fs = require('fs');
  var path = require('path');
  var Buffer = require('buffer').Buffer;

  var join = path.join;
  var basename = path.basename;

  try {
    var uglifyjs = require('uglify-js');
  } catch(e) {}

  var REG_NL = /\r\n|\r|\n/g;

  var basePath = __dirname;

  var opts = process.argv.slice(2).reduce(function(opts, el) {
    return (opts[el.replace(/^-+/, '')] = 1) && opts;
  }, {});

  var sourceFiles = []
    , sourceLines = [];

  //var target = (opts.apache) ? 'apache' : 'iis';

  if (opts.apache) {
    //build for apache/v8cgi
    opts._pre = [];
    opts._head = [
      '(function(global) {',
      '"use strict";'
    ];
    opts._load = [
      //load framework core (instantiates `app` and `define`)
      'app/system/core.js',
      //load shim/patches
      'app/system/adapters/shared',
      //load framework modules
      'app/system/lib',
      'app/config',
      'app/controllers',
      'app/helpers',
      //load adapter specific modules
      'app/system/adapters/apache',
      //load init (fires app.ready)
      'app/system/adapters/v8cgi.js'
    ];
    opts._foot = [
      '})({})'
    ];
    opts._end = [];
    opts.bom = false;
    opts.target = 'app/build/app.sjs';
  } else {
    //build for iis/asp
    opts._pre = [
      '<%@LANGUAGE="JAVASCRIPT" CODEPAGE="65001"%>',
      '<script runat="server" language="javascript">'
    ];
    opts._head = [
      '(function(global, iis) {',
      '"use strict";'
    ];
    opts._load = [
      //load framework core (instantiates `app` and `define`)
      'app/system/core.js',
      //load shim/patches
      'app/system/support',
      'app/system/adapters/shared',
      'app/system/adapters/activex',
      //load framework modules
      'app/system/lib',
      'app/config',
      'app/controllers',
      'app/helpers',
      //load adapter specific modules
      'app/system/adapters/iis',
      //load init (fires app.ready)
      'app/system/adapters/asp.js'
    ];
    opts._foot = [
      '})({}, {req: Request, res: Response, svr: Server, app: Application})'
    ];
    opts._end = [
      '</script>'
    ];
    //include bom unless otherwise specified
    opts.bom = !('no-bom' in opts);
    opts.target = 'app/build/app.asp';
  }


  sourceLines.push.apply(sourceLines, opts._head);
  opts._load.forEach(load);
  sourceLines.push.apply(sourceLines, opts._foot);

  sourceLines = preProcess(sourceLines);

  if (opts.m) {
    if (!uglifyjs) {
      console.err('Cannot find module uglify-js.');
      process.exit();
    }
    var mangle = ('mangle' in opts);
    sourceLines = [uglify(sourceLines.join('\n'), mangle)];
    //don't need a bom because uglify has escaped all unicode chars
    opts.bom = false;
  } else
  if (opts.e) {
    //todo: add source-line mapping for error handling
  }

  sourceLines.unshift.apply(sourceLines, opts._pre);
  sourceLines.push.apply(sourceLines, opts._end);


  //construct buffer including byte-order-mark and source
  var bom = opts.bom ? new Buffer('EFBBBF', 'hex') : new Buffer(0)
    , source = sourceLines.join('\r\n')
    , sourceLength = Buffer.byteLength(source);
  var buffer = new Buffer(bom.length + sourceLength);
  bom.copy(buffer);
  buffer.write(source, bom.length, sourceLength, 'utf8');
  fs.writeFileSync(join(basePath, opts.target), buffer);


  //helpers

  function load(path) {
    return (basename(path).match(/\.js$/)) ? loadFile(path) : loadPath(path);
  }

  function loadFile(path) {
    var fullpath = join(basePath, path);
    if (!opts.q) console.log('load file', path);
    var filedata = fs.readFileSync(fullpath, 'utf8');
    var lines = filedata.split(REG_NL);
    sourceFiles.push({
      path: path,
      fullpath: fullpath,
      lineOffset: sourceLines.length,
      lineCount: lines.length
    });
    sourceLines = sourceLines.concat(lines);
  }

  function loadPath(dir) {
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
        loadFile(join(dir, item));
      }
    });
  }

  function preProcess(lines) {
    var code = lines.join('\n');
    code = code.replace(/\/\*@(\w+)\{([\s\S]*?)\}@\*\//g, function(all, directive, content) {
      if (directive == 'add') {
        return content;
      } else
      if (directive == 'remove') {
        return '';
      }
      return all;
    });
    return code.split('\n');
  }

  function uglify(code, mangle) {
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

  function removeStrict(ast) {
    var pro = uglifyjs.uglify;
    var w = pro.ast_walker();
    var handler = function(dir) {
      if (dir == 'use strict') return ['block'];
    };
    ast = w.with_walkers({directive: handler}, function() {
      return w.walk(ast);
    });
    return ast;
  }

})();