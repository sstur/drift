var fs = require('fs');
var path = require('path');
var babel = require('babel-core');

var dirname = path.dirname;

var REG_NL = /\r\n|\r|\n/g;
var REG_DOC_BLOCK = /^\s*\/\*\*([\s\S]*?)\*\//;

var utils = {
  transformSourceFile: function(source, filename, options) {
    if (~filename.indexOf('/node_modules/')) {
      return source;
    }
    options = options || {};
    var directives = parseDirectives(source);
    //transform JSX and ES6
    if (directives.jsx || directives.es6) {
      source = utils.transformES6(source);
    }
    //wrap source based on directive
    if (directives.providesModule) {
      source = wrapDefine(directives.providesModule, source);
    } else if (directives.onAppState) {
      source = wrapOnAppState(directives.onAppState, source);
    }
    var dir = dirname(filename);
    //hacky: some special logic for files in `app/config`
    var isConfig =
      dir
        .split('/')
        .slice(-2)
        .join('/') === 'app/config';
    if (isConfig && options.pkgConfig) {
      source = transformConfigValues(source, options.pkgConfig);
    }
    return source;
  },

  readJSON: function(path) {
    try {
      var result = fs.readFileSync(path, 'utf8');
    } catch (e) {}
    return JSON.parse(result || '{}');
  },

  transformES6: function(source) {
    var plugin = function(name) {
      return require.resolve('babel-plugin-' + name);
    };
    var preset = function(name) {
      return require.resolve('babel-preset-' + name);
    };
    var result = babel.transform(source, {
      retainLines: true,
      plugins: [
        // part of stage-1
        plugin('transform-class-properties'),
      ],
      presets: [preset('es2015-loose'), preset('react'), preset('stage-2')],
    });
    //var {code, map, ast} = result;
    return result.code;
  },
};

function wrapDefine(name, source) {
  return [
    'define(' + JSON.stringify(name) + ', function(require, exports, module) {',
    source,
    '});',
  ].join('');
}

function wrapOnAppState(state, source) {
  return [
    'app.on(' + JSON.stringify(state) + ', function(require) {',
    source,
    '});',
  ].join('');
}

function parseDirectives(source) {
  var directives = {};
  var match = source.match(REG_DOC_BLOCK);
  if (match) {
    var docBlock = match[1];
    var lines = docBlock.split(REG_NL);
    lines.forEach(function(line) {
      line = line.trim().replace(/^\*\s*/, '');
      if (line.match(/^@\w/)) {
        var parts = line.split(' ');
        var name = parts.shift().slice(1);
        var value = parts.join(' ').trim();
        directives[name] = value || true;
      }
    });
  }
  return directives;
}

function transformConfigValues(source, pkgConfig) {
  //allow references to package.json
  return source.replace(/('|")\{\{package:(.*?)\}\}\1/g, function(str, _, key) {
    var value = pkgConfig[key] == null ? '' : pkgConfig[key];
    return JSON.stringify(value);
  });
}

module.exports = utils;
