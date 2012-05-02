(function() {
  "use strict";

  require('fibers');
  var Fiber = global.Fiber;

  //patch fiber.run() to better handle exceptions
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
   * Fiber.sync() turns any asynchronous function to synchronous one
   * It receives function, context object and then arguments.
   *
   */
  Fiber.sync = function(fn, obj /* arguments */) {
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
      console.log(obj, args);
      fn.apply(obj, args);

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

  module.exports = Fiber;

})();