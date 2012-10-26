/**
 * Build and optionally uglify/mangle the entire application to
 * one platform-specific script file.
 *
 */
(function() {
  "use strict";

  var fs = require('fs');
  var path = require('path');
  var Buffer = require('buffer').Buffer;

  var join = path.join;

  try {
    var uglifyjs = require('uglify-js');
  } catch(e) {}

  var REG_NL = /\r\n|\r|\n/g;

  var basePath = path.dirname(process.argv[1]);

  var opts = process.argv.slice(2).reduce(function(opts, el) {
    return (opts[el.replace(/^-+/, '')] = 1) && opts;
  }, {});

  if (opts.apache) {
    //build for apache/v8cgi
    opts._pre = [''];
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
      '<%@LANGUAGE="JAVASCRIPT" CODEPAGE="65001" ENABLESESSIONSTATE="FALSE"%>',
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

  var sourceFiles = []
    , sourceLines = []
    , offset = opts._pre.length;

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
    //don't need a bom because uglify has escaped extended chars
    opts.bom = false;
  } else
  if (opts.apache) {
    //we intentionally have a blank line for this
    opts._pre[0] = 'var map = ' + JSON.stringify(sourceFiles) + ';';
  } else {
    //for iis the error handling goes in a separate file
    var errhandler = fs.readFileSync(join(basePath, 'app/system/adapters/iis/_error.js'), 'utf8');
    var errfile = [
      '<%@LANGUAGE="JAVASCRIPT" CODEPAGE="65001" ENABLESESSIONSTATE="FALSE"%>',
      '<script runat="server" language="javascript">',
      errhandler.replace('[/*SRCMAP*/]', JSON.stringify(sourceFiles)),
      '<\/script>'
    ];
    fs.writeFileSync(join(basePath, 'app/build/err.asp'), errfile.join('\r\n'), 'utf8');
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
    return (path.match(/\.js$/)) ? loadFile(path) : loadPath(path);
  }

  function loadFile(path) {
    var fullpath = join(basePath, path);
    if (!opts.q) console.log('load file', path);
    var filedata = fs.readFileSync(fullpath, 'utf8');
    var lines = filedata.split(REG_NL);
    sourceFiles.push({
      path: path,
      lineOffset: offset + sourceLines.length,
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
    //replace special comments indicating compiler directives
    code = code.replace(/\/\*@(\w+)\{([\w\W]+?)\}@\*\//g, function(all, directive, content) {
      var lines = all.split('\n').length;
      if (directive == 'add') {
        return content;
      } else
      if (directive == 'remove') {
        return new Array(lines).join('\n');
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