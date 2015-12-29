var fs = require('fs');
var path = require('path');
var babel = require('babel-core');

var dirname = path.dirname;

var REG_NL = /\r\n|\r|\n/g;
var REG_DOC_BLOCK = /^\s*\/\*\*([\s\S]*?)\*\//;

var utils = {

  transformSourceFile: function(source, filename, options, outputOptions) {
    if (~filename.indexOf('/node_modules/')) {
      return source;
    }
    options = options || {};
    var directives = parseDirectives(source);
    //wrap commonJS-style modules
    if (directives.providesModule) {
      source = wrapModule(directives.providesModule, source);
    }
    if (directives.es6 && outputOptions != null) {
      outputOptions.includeES6Polyfills = true;
    }
    //transform JSX and ES6
    if (directives.jsx || directives.es6) {
      source = utils.transformES6(source);
    }
    var dir = dirname(filename);
    //hacky: some special logic for files in `app/config`
    var isConfig = (dir.split('/').slice(-2).join('/') === 'app/config');
    if (isConfig && options.pkgConfig) {
      source = transformConfigValues(source, options.pkgConfig);
    }
    return source;
  },

  readJSON: function(path) {
    try {
      var result = fs.readFileSync(path, 'utf8');
    } catch(e) {}
    return JSON.parse(result || '{}');
  },

  transformES6: function(source) {
    var plugin = (name) => require.resolve('babel-plugin-' + name);
    var result = babel.transform(source, {
      retainLines: true,
      plugins: [
        // ecmascript stage-1
        plugin('transform-class-properties'),
        // ecmascript stage-2
        plugin('syntax-trailing-function-commas'),
        plugin('transform-object-rest-spread'),
        // ecmascript stage-3
        plugin('transform-async-to-generator'),
        plugin('transform-exponentiation-operator'),
        // ecmascript 2015
        plugin('check-es2015-constants'),
        plugin('transform-es2015-arrow-functions'),
        plugin('transform-es2015-block-scoped-functions'),
        plugin('transform-es2015-block-scoping'),
        plugin('transform-es2015-classes'),
        plugin('transform-es2015-computed-properties'),
        plugin('transform-es2015-destructuring'),
        plugin('transform-es2015-for-of'),
        plugin('transform-es2015-function-name'),
        plugin('transform-es2015-literals'),
        plugin('transform-es2015-modules-commonjs'),
        plugin('transform-es2015-object-super'),
        plugin('transform-es2015-parameters'),
        plugin('transform-es2015-shorthand-properties'),
        plugin('transform-es2015-spread'),
        plugin('transform-es2015-sticky-regex'),
        plugin('transform-es2015-template-literals'),
        plugin('transform-es2015-typeof-symbol'),
        plugin('transform-es2015-unicode-regex'),
        plugin('transform-regenerator'),
        // react/jsx/flow
        plugin('syntax-flow'),
        plugin('syntax-jsx'),
        plugin('transform-flow-strip-types'),
        plugin('transform-react-jsx')
      ]
    });
    //var {code, map, ast} = result;
    return result.code;
  }

};

function wrapModule(name, source) {
  return [
    'define(' + JSON.stringify(name) + ', function(require, exports, module) {',
    source,
    '});'
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
    var value = (pkgConfig[key] == null) ? '' : pkgConfig[key];
    return JSON.stringify(value);
  });
}

module.exports = utils;
