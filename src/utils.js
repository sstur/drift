const babel = require('@babel/core');

exports.transformSourceFile = (source, filename) => {
  if (~filename.indexOf('/node_modules/')) {
    return source;
  }
  return filename.match(/\.ts$/) ? transformTS(source) : transformJS(source);
};

function transformJS(source) {
  let result = babel.transform(source, {
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
  //let {code, map, ast} = result;
  return result.code;
}

function transformTS(source) {
  let result = babel.transform(source, {
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
  //let {code, map, ast} = result;
  return result.code;
}
