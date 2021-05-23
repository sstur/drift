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

/** Fiber.fiberize() turns an asynchronous function to a fiberized one */
Fiber.fiberize = function(fn) {
  var arity = fn.length;

  return function() {
    var fiber = Fiber.current;
    var err;
    var result;
    var yielded = false;

    var args = slice.call(arguments);

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
    fn.apply(this, args);

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
