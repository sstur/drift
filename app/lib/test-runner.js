/*global app, define */
define('test-runner', function(require, exports, module) {
  "use strict";
  module.exports = TestRunner;

  var util = require('util');
  var noop = function() {};

  function TestSuite(cfg) {
    if (!(this instanceof TestSuite)) {
      return new TestSuite(cfg);
    }
    this.loadOption(cfg, 'name', 'unnamed');
    this.loadOption(cfg, 'description', this.name);
    this.loadOption(cfg, 'setup', noop);
    this.loadOption(cfg, 'teardown', noop);
    this.loadOption(cfg, 'beforeEach', noop);
    this.loadOption(cfg, 'afterEach', noop);
    this.testCases = cfg;
  }

  util.extend(TestSuite.prototype, {
    loadOption: function(opts, name, defaultValue) {
      this[name] = (name in opts) ? opts[name] : defaultValue;
      delete opts[name];
    },
    log: function() {
      this.runner.log.apply(this.runner, arguments);
    }
  });

  function TestRunner(opts) {
    if (!(this instanceof TestRunner)) {
      return new TestRunner(opts);
    }
    this.suites = [];
    this.output = [];
  }

  util.extend(TestRunner.prototype, {
    addSuite: function(suite) {
      var suites = this.suites;
      var array = Array.isArray(suite) ? suite : [suite];
      array.forEach(function(cfg) {
        suites.push(new TestSuite(cfg));
      });
    },
    format_html: function(item, error) {
      var firstTest = (this.output.length == 0);
      if (firstTest) {
        this.writeLine('<style>body { margin: 20px } h1 { margin: 0; font-size: 120%; font-family: "Helvetica Neue", Helvetica, "Myriad Pro", "Lucida Grande", sans-serif } pre { margin: 10px; font-family: Consolas, "Liberation Mono", Courier, monospace; } .pass { color: #090 } .fail { color: #900 } .message { display: block; background: #eee } .message:before { display: block; float: left; content: "    "; height: 100% }</style>');
        this.writeLine('<body>');
      }
      if (item instanceof TestSuite) {
        if (!firstTest) {
          this.writeLine('</pre></code>');
        }
        this.writeLine('<h1>' + util.htmlEnc(item.description) + '</h1>');
        this.writeLine('<pre><code>');
      } else {
        if (!error) {
          this.writeLine('<span class="pass">✔ PASS ››› </span><span class="name">' + util.htmlEnc(item) + '</span>');
        } else {
          this.writeLine('<span class="fail">✖ FAIL ‹‹‹ </span><span class="name">' + util.htmlEnc(item) + '</span>\n<span class="message">' + util.htmlEnc(error.message) + '</span>');
        }
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
      this.suites.forEach(function(suite) {
        suite.runner = self;
        suite.setup();
        self.logResult(suite);
        forEach(suite.testCases, function(name, fn, i) {
          suite.beforeEach();
          fn.call(suite, name, i);
          suite.afterEach();
          try {
          } catch(e) {
            var error = e;
          }
          self.logResult(name, error);
          return (error) ? false : null;
        });
        suite.teardown();
      });
      if (this.writeStream) {
        this.writeStream.end();
      }
      return this.output.join('\n');
    }
  });

});