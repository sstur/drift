var fs = require('fs');
var path = require('path');
var reactTools = require('react-tools');

var join = path.join;
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
    //wrap commonJS-style modules
    if (directives.providesModule) {
      source = wrapModule(directives.providesModule, source);
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
    return reactTools.transform(source, {harmony: true});
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
