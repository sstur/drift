/*global app, define */
define('test-runner', function(require, exports, module) {
  "use strict";
  module.exports = TestRunner;

  var util = require('util');
  var noop = function() {};

  function TestRunner(opts) {
    if (!(this instanceof TestRunner)) {
      return new TestRunner(opts);
    }
    this.output = [];
    this.loadOption(opts, 'format');
    this.loadOption(opts, 'setup', noop);
    this.loadOption(opts, 'teardown', noop);
    this.loadOption(opts, 'beforeEach', noop);
    this.loadOption(opts, 'afterEach', noop);
    this.testCases = opts;
  }

  util.extend(TestRunner.prototype, {
    loadOption: function(opts, name, defaultValue) {
      this[name] = (name in opts) ? opts[name] : defaultValue;
      delete opts[name];
    },
    format_html: function(name, error) {
      if (this.output.length == 0) {
        this.writeLine('<style>.pass { color: #090 } .fail { color: #900 } .message { display: block; background: #eee } .message:before { display: block; float: left; content: "    "; height: 100% }</style>');
        this.writeLine('<body><pre><code>');
      }
      if (!error) {
        this.writeLine('<span class="pass">✔ PASS ››› </span><span class="name">' + util.htmlEnc(name) + '</span>');
      } else {
        this.writeLine('<span class="fail">✖ FAIL ‹‹‹ </span><span class="name">' + util.htmlEnc(name) + '</span>\n<span class="message">' + util.htmlEnc(error.message) + '</span>');
      }
    },
    format_text: function(name, error) {
      if (!error) {
        this.writeLine('✔ PASS ››› ' + name);
      } else {
        this.writeLine('✖ FAIL ‹‹‹ ' + name + '\n' + error.message);
      }
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
    run: function(opts) {
      opts = opts || {};
      //format can be specified on instantiation or here
      var format = opts.format || this.format || 'text';
      this.logResult = this['format_' + format];
      this.writeStream = opts.writeStream;
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
        return (error) ? false : null;
      });
      self.teardown();
      if (this.writeStream) {
        this.writeStream.end();
      }
      return this.output.join('\n');
    }
  });

});