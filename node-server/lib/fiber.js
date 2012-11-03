/*global global, process, require, module, exports */
(function() {
  "use strict";

  var Fiber = require('fibers');

  //patch fiber.run() to send errors to fiber.onError()
  var _run = Fiber.prototype.run;
  Fiber.prototype.run = function() {
    try {
      return _run.apply(this, arguments);
    } catch(e) {
      if (this.onError) {
        this.onError(e);
      } else {
        throw e;
      }
    }
  };

  Fiber.prototype.abort = function(callback) {
    var fiber = Fiber.current;
    process.nextTick(function() {
      if (callback) callback();
      fiber.reset();
    });
    Fiber.yield();
  };

  /**
   * Fiber.fiberize() turns an asynchronous function to a fiberized one
   * It receives function, context object and then arguments.
   *
   */
  Fiber.fiberize = function(fn, obj /* arguments */) {
    var dynamicBinding = (arguments.length == 1);

    var bindArgs = Array.prototype.slice.call(arguments, 2);
    return function() {
      var args = Array.prototype.slice.call(arguments)
        , fiber = Fiber.current
        , err, result
        , yielded = false;

      args = bindArgs.concat(args);

      // virtual callback
      function syncCallback(callbackError, callbackResult) {
        // forbid to call twice
        if (syncCallback.called) return;
        syncCallback.called = true;

        if (callbackError) {
          err = callbackError;
        } else {
          // Handle situation when callback returns many values
          if (arguments.length > 2) {
            callbackResult = Array.prototype.slice.call(arguments, 1);
          }

          // Assign callback result
          result = callbackResult;
        }

        // Resume fiber if yielding
        if (yielded) fiber.run();
      }

      // push it as last argument
      args.push(syncCallback);

      // call async function
      fn.apply(dynamicBinding ? this : obj, args);

      // wait for result
      if (!syncCallback.called) {
        yielded = true;
        Fiber.yield();
      }

      // Throw if err
      if (err) throw err;

      return result;
    };
  };

  /**
   * Fiber.fiberizeModule() turns a specially written asynchronous module into
   * a fiberized one. Methods with names ending in _ are considered to be async.
   *
   */
  Fiber.fiberizeModule = function(module, methodNames) {
    var exports = {};
    methodNames = (typeof methodNames == 'string') ? methodNames.split(' ') : Object.keys(module);
    methodNames.forEach(function(methodName) {
      //exclude "private" methods
      if (methodName.charAt(0) == '_') return;
      var method = module[methodName];
      if (typeof method == 'function') {
        exports[methodName] = (methodName.slice(-1) == '_') ? Fiber.fiberize(method, module) : method.bind(module);
      }
    });
    return exports;
  };

  module.exports = Fiber;

})();