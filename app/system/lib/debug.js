/*global app, define */
/* eslint-disable one-var, no-caller */
define('debug', function(require, exports) {

  exports.stackTrace = function stackTrace(fn) {
    fn = fn || arguments.callee.caller;
    var dump = [], maxDepth = 5;
    while (dump.length < maxDepth && fn && (fn = fn.caller)) {
      dump.push(fn.toString());
    }
    return dump.join('\r\n\r\n\r\n');
  };

});
