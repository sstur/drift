/**
 * Build and optionally uglify/mangle the entire application to
 * one platform-specific script file.
 *
 */
/*global process, require, module, exports */
(function() {
  "use strict";

  var fs = require('fs');
  var path = require('path');

  var join = path.join;

  //files beginning with these chars are excluded
  var EXCLUDE = {'_': 1, '.': 1, '!': 1};
  //this whole literal matching is flawed; it would match `var a = 1/2, b = 'c/d';` and now we have an unterminated string
  var COMMENT_OR_LITERAL = /\/\*([\s\S]*?)\*\/|'(\\.|[^'\n])*'|"(\\.|[^"\n])*"|\/(\\.|[^\/\n])+\/|\/\/(.*)/gm;
  var STRINGS = {"'": 1, '"': 1};
  var COMMENTS = {'//': 1, '/*': 1};

  try {
    var uglifyjs = require('uglify-js');
  } catch(e) {}

  var debugify = require('debugify');

  var REG_NL = /\r\n|\r|\n/g;

  var basePath = path.dirname(process.argv[1]);

  var opts = process.argv.slice(2).reduce(function(opts, el) {
    return (opts[el.replace(/^-+/, '')] = 1) && opts;
  }, {});

  var config;
  try {
    config = fs.readFileSync(join(basePath, 'build-conf.json'), 'utf8');
  } catch(e) {}
  config = JSON.parse(config || '{}');

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
      //load config
      'app/system/config',
      'app/config',
      //load adapter specific modules
      'app/system/adapters/shared',
      'app/system/adapters/apache',
      //load framework modules
      'app/system/lib',
      'app/helpers',
      'app/init',
      'app/lib',
      'app/controllers',
      //load init (fires app.ready)
      'app/system/adapters/v8cgi.js'
    ];
    opts._foot = [
      '})({platform: "apache v8cgi"})'
    ];
    opts._end = [];
    opts.target = 'build/app.sjs';
  }
  if (opts.iis) {
    //build for iis/asp
    opts._pre = [
      '<%@LANGUAGE="JAVASCRIPT" CODEPAGE="65001" ENABLESESSIONSTATE="FALSE"%>'
    ];
    opts._head = [
      '<script runat="server" language="javascript">',
      '(function(global, iis) {',
      '"use strict";'
    ];
    opts._load = [
      //load shim/patches
      'app/system/support',
      //load framework core (instantiates `app` and `define`)
      'app/system/core.js',
      //load config
      'app/system/config',
      'app/config',
      //load adapter specific modules
      'app/system/adapters/shared',
      'app/system/adapters/activex',
      //load framework modules
      'app/system/lib',
      'app/helpers',
      'app/init',
      'app/lib',
      'app/controllers',
      //load adapter specific modules
      'app/system/adapters/iis',
      //load init (fires app.ready)
      'app/system/adapters/asp.js'
    ];
    opts._foot = [
      '})({platform: "iis asp"}, {req: Request, res: Response, app: Application, server: Server})',
      '</script>'
    ];
    opts._end = [];
    opts.target = 'build/app.asp';
  } else {
    //build for wscript (repl)
    opts._pre = [
      '<package><job id="job">'
    ];
    opts._head = [
      '<script language="javascript">"<![CDATA[";',
      'var global = this, platform = "wscript";'
    ];
    opts._load = [
      //load shim/patches
      'app/system/support',
      //load framework core (instantiates `app` and `define`)
      'app/system/core.js',
      //load config
      'app/system/config',
      'app/config',
      //load adapter specific modules
      'app/system/adapters/shared',
      'app/system/adapters/activex',
      //load framework modules
      'app/system/lib',
      'app/helpers',
      'app/init',
      'app/lib',
      'app/controllers',
      'app/system/adapters/repl.js'
    ];
    opts._foot = [
      ';"]]>";</script>'
    ];
    opts._end = [
      '</job></package>'
    ];
    opts.target = 'build/repl.wsf';
  }

  if (config.compileViews) {
    var compileViews = stringifyCompiledViews(readCompiledViews('views'));
    opts._head.push('global.compiledViews = ' + escapeSource(compileViews) + ';');
  }

  var sourceFiles = []
    , sourceLines = []
    , lineOffsets = {}
    , offset = opts._pre.length;

  //todo: _head and _foot should be added after uglify/stripSource
  sourceLines.push.apply(sourceLines, opts._head);
  opts._load.forEach(function(path) {
    return (path.match(/\.js$/)) ? loadFile(path) : loadPath(path);
  });
  sourceLines.push.apply(sourceLines, opts._foot);

  sourceLines = preProcess(sourceLines);

  if (opts.m) {
    throw new Error('minification code needs to be fixed');
    if (!uglifyjs) {
      console.err('Cannot find module uglify-js.');
      process.exit();
    }
    var mangle = ('mangle' in opts);
    sourceLines = [uglify(sourceLines.join('\n'), mangle)];
  } else {
    sourceLines = stripSource(sourceLines);
    if (opts.apache) {
      //we intentionally have a blank line for this
      opts._pre[0] = 'var offsets = ' + JSON.stringify(lineOffsets) + ', map = ' + JSON.stringify(sourceFiles) + ';';
    } else {
      //for iis the error handling goes in a separate file
      var errhandler = fs.readFileSync(join(basePath, 'app/system/adapters/iis/!error.js'), 'utf8');
      errhandler = errhandler.replace('[/*SRCMAP*/]', JSON.stringify(lineOffsets) + ', ' + JSON.stringify(sourceFiles));
      errhandler = errhandler.replace('{/*CONFIG*/}', JSON.stringify({emailErrors: config.emailErrors}));
      var errfile = [
        '<%@LANGUAGE="JAVASCRIPT" CODEPAGE="65001" ENABLESESSIONSTATE="FALSE"%>',
        '<script runat="server" language="javascript">',
        errhandler,
        '<\/script>'
      ];
      fs.writeFileSync(join(basePath, 'build/err.asp'), errfile.join('\r\n'), 'utf8');
    }
  }

  sourceLines.unshift.apply(sourceLines, opts._pre);
  if ('appendLines' in config) {
    sourceLines.push.apply(sourceLines, config.appendLines);
  }
  sourceLines.push.apply(sourceLines, opts._end);

  var source = sourceLines.join('\r\n');
  fs.writeFileSync(join(basePath, opts.target), source, 'utf8');


  //helpers

  function loadFile(path) {
    var fullpath = join(basePath, path);
    var exclude = config.exclude || [], shortpath = path.replace(/^app\//, ''), skip = false;
    //console.log(exclude, shortpath);
    exclude.forEach(function(excl) {
      if (excl === shortpath) skip = true;
      if (excl.charAt(0) === '*') {
        if (path.slice(0 - excl.length + 1) === excl.slice(1)) skip = true;
      }
    });
    if (skip) return;
    if (!opts.q) console.log('load file', path);
    var filedata = fs.readFileSync(fullpath, 'utf8');
    filedata = escapeSource(filedata);
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
    try {
      var items = fs.readdirSync(path);
    } catch(e) {
      if (e.code == 'ENOENT') {
        return console.log('Not Found: ' + dir);
      }
      throw e;
    }
    items.forEach(function(item) {
      if (item.charAt(0) in EXCLUDE) return;
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

  function readCompiledView(path, views) {
    var fullpath = join(basePath, path);
    if (!opts.q) console.log('read compiled view', path);
    //todo: remove extension from path?
    views[path] = fs.readFileSync(fullpath, 'utf8');
  }

  function readCompiledViews(dir, views) {
    views = views || {};
    var path = join(basePath, dir);
    var items = fs.readdirSync(path);
    items.forEach(function(item) {
      if (item.charAt(0) in EXCLUDE) return;
      var fullpath = join(path, item);
      var stat = fs.statSync(fullpath);
      if (stat.isDirectory()) {
        readCompiledViews(join(dir, item), views);
      } else
      if (stat.isFile() && item.match(/\.js$/)) {
        readCompiledView(join(dir, item), views);
      }
    });
    return views;
  }

  function stringifyCompiledViews(obj) {
    var output = [];
    Object.keys(obj).forEach(function(name) {
      var code = obj[name];
      //todo: this is a hacky way of doing statement -> expression
      output.push(JSON.stringify(name) + ':' + code.toString().replace(/;$/, ''));
    });
    return '{' + output.join(',') + '}';
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

  function escapeSource(code) {
    var isArray = Array.isArray(code);
    if (isArray) code = code.join('\n');
    code = code.replace(COMMENT_OR_LITERAL, function(str) {
      //exit if not a string literal
      if (!(str.charAt(0) in STRINGS)) return str;
      //strings: escape unicode
      str = str.replace(/[\u0080-\uFFFF]/, function(c) {
        return '\\u' + ('00' + c.charCodeAt(0).toString(16)).slice(-4);
      });
      //escape script tags and html comments in strings
      str = str.replace(/<(\/?script)\b/gi, '\\x3c$1');
      str = str.replace(/<!--/gi, '\\x3c!--');
      str = str.replace(/(--|]])>/gi, '$1\\x3e');
      return str;
    });
    return (isArray) ? code.split('\n') : code;
  }

  //takes an array of lines, returns array
  function stripSource(code) {
    code = Array.isArray(code) ? code.join('\n') : code;

    code = code.replace(COMMENT_OR_LITERAL, function(str) {
      //don't remove special comments
      if (str.slice(0, 3) == '/*@') {
        var type = 'special_comment';
      } else
      if (str.slice(0, 2) == '/*') {
        type = 'block_comment'
      } else
      if (str.slice(0, 2) == '//') {
        type = 'line_comment'
      } else
      if (str.charAt(0) == '/') {
        type = 'regular_expression'
      } else {
        type = 'string'
      }
      if (type == 'block_comment' || type == 'line_comment') {
        //remove, replacing with newlines
        var lines = str.split('\n').length;
        return new Array(lines).join('\n');
      }
      return str;
    });

    //remove "use strict" directives (added at top level)
    code = code.replace(/^[ \t]*("|')use strict\1;?[ \t]*$/mg, '');

    //remove empty lines
    var removed = 0, result = [];
    code.split('\n').forEach(function(line) {
      if (line.trim()) {
        result.push(line);
        if (removed) {
          lineOffsets[result.length] = removed;
        }
        removed = 0;
      } else {
        removed++;
        return '';
      }
    });

    if (debugify && opts.debug) {
      var old = result, sliced = result.slice(2, -2);
      result = debugify(sliced.join('\n'), 4).split('\n');
      result.unshift.apply(result, old.slice(0, 2));
      result.push.apply(result, old.slice(-2));
    }
    return result;
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