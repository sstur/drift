/*global app, define */
define('test-runner', function(require, exports, module) {
  "use strict";
  module.exports = TestRunner;

  var util = require('util');
  var noop = function() {};

  function TestRunner(cfg) {
    if (!(this instanceof TestRunner)) {
      return new TestRunner(cfg);
    }
    this.output = [];
    this.setup = cfg.setup || noop;
    delete cfg.setup;
    this.teardown = cfg.teardown || noop;
    delete cfg.teardown;
    this.beforeEach = cfg.beforeEach || noop;
    delete cfg.beforeEach;
    this.afterEach = cfg.afterEach || noop;
    delete cfg.afterEach;
    this.testCases = cfg;
  }

  util.extend(TestRunner.prototype, {
    logResult: function(name, error) {
      if (error) {
        var line = 'FAIL: ' + name + '\n' + error.message;
      } else {
        line = 'PASS: ' + name;
      }
      this.writeLine(line);
    },
    writeLine: function(line) {
      this.output.push(line);
      if (this.writeStream) {
        this.writeStream.write(line + '\n');
      }
    },
    log: function() {
      var self = this;
      toArray(arguments).forEach(function(value) {
        var isObject = (Object(value) === value);
        self.writeLine(isObject ? util.inspect(value) : String(value));
      });
    },
    run: function(writeStream) {
      this.writeStream = writeStream;
      var self = this;
      self.setup();
      forEach(this.testCases, function(name, fn, i) {
        try {
          self.beforeEach();
          fn.call(self, name, i);
          self.afterEach();
        } catch(e) {
          var error = e;
        }
        self.logResult(name, error);
      });
      self.teardown();
      if (writeStream) {
        writeStream.end();
      }
      return this.output.join('\n');
    }
  });

});