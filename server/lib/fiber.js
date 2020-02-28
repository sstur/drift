/*global global, process, require, module, exports */
(function() {
  'use strict';

  var Fiber = require('fibers');
  var slice = Array.prototype.slice;

  //patch fiber.run() to send errors to fiber.onError()
  //todo: skip this if some flag is set on app/adapter (from a command-line flag)
  var _run = Fiber.prototype.run;
  Fiber.prototype.run = function() {
    try {
      return _run.apply(this, arguments);
    } catch (e) {
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
    var dynamicBinding = arguments.length === 1;
    var arity = fn.length;
    var bindArgs = slice.call(arguments, 2);

    return function() {
      var fiber = Fiber.current;
      var err;
      var result;
      var yielded = false;

      var args = slice.call(arguments);
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
            callbackResult = slice.call(arguments, 1);
          }

          // Assign callback result
          result = callbackResult;
        }

        // Resume fiber if yielding
        if (yielded) fiber.run();
      }

      // in case of optional arguments, make sure the callback is at the index expected
      if (args.length + 1 < arity) {
        args[arity - 1] = syncCallback;
      } else {
        args.push(syncCallback);
      }

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
  Fiber.fiberizeModule = function fiberizeModule(module, methodNames) {
    methodNames =
      typeof methodNames == 'string'
        ? methodNames.split(' ')
        : Object.keys(module);
    methodNames.forEach(function(methodName) {
      //exclude "private" methods
      if (methodName.charAt(0) == '_') return;
      //exclude "super_" created by util.inherits
      if (methodName == 'super_') return;
      var method = module[methodName];
      if (typeof method == 'function') {
        if (methodName.slice(-1) == '_') {
          delete module[methodName];
          methodName = methodName.slice(0, -1);
          module[methodName] = Fiber.fiberize(method);
        }
        //constructors that are exported like `exports.ClassName = ClassName`
        else if (method.name && method.prototype) {
          fiberizeModule(method.prototype);
        }
      }
    });
    //constructors that are exported like `module.exports = ClassName`
    if (typeof module == 'function' && module.name && module.prototype) {
      fiberizeModule(module.prototype);
    }
    return module;
  };

  module.exports = Fiber;
})();
