(function() {
  "use strict";
  var util = require('util');
  var rocambole = require('rocambole');

  function debugify(source, offset) {
    var lines = source.split('\n');

    var indexToLine = function(index) {
      var sum = 0, len = lines.length;
      for (var i = 0; i < len; i++) {
        sum += lines[i].length + 1;
        if (sum >= index) return i + offset;
      }
      return 0;
    };

    var ast = rocambole.parse(source);
    rocambole.recursive(ast, function(node) {
      if (node.type == 'FunctionExpression' || node.type == 'FunctionDeclaration') {
        wrapFunction(node, indexToLine(node.range[0]));
      }
    });

    return ast.toString();
  }

  module.exports = debugify;


  /*!
   * Helpers
   */

  function wrapFunction(func, line) {
    var tryStmt = getTryCatch(line);
    var tryClose = tryStmt.startToken.next.next;
    //disconnect the `try{` from `}catch`
    tryClose.prev.next = null;
    //insert `try{` after function open bracket
    insertSeriesAfter(func.body.startToken, tryStmt.startToken);
    //insert `}catch` after function close bracket
    insertSeriesAfter(func.body.endToken.prev, tryClose);
  }

  function insertAfter(target, newToken) {
    target.next = newToken;
    newToken.prev = target;
  }

  function getLast(node) {
    while (node.next) {
      node = node.next;
    }
    return node;
  }

  function insertSeriesAfter(target, newTokens) {
    var last = getLast(newTokens);
    var first = newTokens;
    var next = target.next;
    insertAfter(target, first);
    insertAfter(last, next);
  }

  function getTryCatch(lineNum) {
    var ast = rocambole.parse('try{}catch(e){hErr(e,' + lineNum + ')}');
    //{type: 'Program', body: [{type: 'TryStatement'}]}
    return ast.body[0];
  }

  //function flatten(node) {
  //  if (!node) return 'none';
  //  var flat = node.type || 'Unknown Type';
  //  if (node.value) flat += ': ' + JSON.stringify(node.value);
  //  return flat;
  //}

  //function simplify(node) {
  //  var result = {type: node.type};
  //  if (node.body) result.body = node.body.length;
  //  result.value = (node.value == null) ? 'null' : node.value;
  //  ['prev', 'next', 'startToken', 'endToken', 'parent'].forEach(function(prop) {
  //    if (node[prop] != null) result[prop] = flatten(node[prop]);
  //  });
  //  return result;
  //}

  //function print() {
  //  for (var i = 0; i < arguments.length; i++) {
  //    var val = arguments[i];
  //    if (Array.isArray(val)) {
  //      console.log(val.map(simplify));
  //    } else
  //    if (val === Object(val)) {
  //      console.log(simplify(val));
  //    } else {
  //      console.log(val);
  //    }
  //  }
  //}

})();