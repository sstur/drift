const babel = require('@babel/core');

const REG_NL = /\r\n|\r|\n/g;
const REG_DOC_BLOCK = /^\s*\/\*\*([\s\S]*?)\*\//;

exports.transformSourceFile = (source, filename) => {
  if (~filename.indexOf('/node_modules/')) {
    return source;
  }
  var directives = parseDirectives(source);
  source = filename.match(/\.ts$/) ? transformTS(source) : transformJS(source);
  //wrap source based on directive
  if (directives.providesModule) {
    source = wrapDefine(directives.providesModule, source);
  } else if (directives.onAppState) {
    source = wrapOnAppState(directives.onAppState, source);
  }
  return source;
};

function transformJS(source) {
  var result = babel.transform(source, {
    retainLines: true,
    plugins: [
      '@babel/plugin-transform-flow-strip-types',
      '@babel/plugin-transform-react-jsx',
      '@babel/plugin-proposal-class-properties',
    ],
    presets: [
      // Target Node 10.x
      ['latest-node', { target: '10.13' }],
    ],
  });
  //var {code, map, ast} = result;
  return result.code;
}

function transformTS(source) {
  var result = babel.transform(source, {
    retainLines: true,
    plugins: [
      '@babel/plugin-transform-typescript',
      '@babel/plugin-transform-react-jsx',
      '@babel/plugin-proposal-class-properties',
    ],
    presets: [
      // Target Node 10.x
      ['latest-node', { target: '10.13' }],
    ],
  });
  //var {code, map, ast} = result;
  return result.code;
}

function wrapDefine(name, source) {
  return [
    'app.define(' +
      JSON.stringify(name) +
      ', function(require, exports, module) {',
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
