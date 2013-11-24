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
    this.loadOption(cfg, 'noCatch', false);
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
    format_html: function(item, suite, time) {
      var firstTest = (this.output.length == 0);
      if (firstTest) {
        this.write('<style>body { margin: 20px } h1 { margin: 0; font-size: 120%; font-family: "Helvetica Neue", Helvetica, "Myriad Pro", "Lucida Grande", sans-serif; text-transform: uppercase } pre { margin: 10px; font-family: Consolas, "Liberation Mono", Courier, monospace; } .pass { color: #090 } .fail { color: #900 } .message { display: block; background: #eee } .message:before { display: block; float: left; content: "    "; height: 100% }</style>');
        this.write('<body>');
      }
      if (item == '#description') {
        if (!firstTest) {
          this.write('</pre></code>');
        }
        this.write('<h1>' + util.htmlEnc(suite.description) + '</h1>');
        this.write('<pre><code>');
      } else
      if (item == '#summary') {
        this.writeLine('Time Elapsed: ' + time + 'ms</span>');
      } else {
        if (!suite.error) {
          this.writeLine('<span class="pass">✔ PASS ››› </span><span class="name">' + util.htmlEnc(item) + ' [' + time + ']</span>');
        } else {
          var desc = (suite.desc) ? '<span class="desc">it ' + util.htmlEnc(suite.desc) + '</span>\n' : '';
          this.writeLine('<span class="fail">✖ FAIL ‹‹‹ </span><span class="name">' + util.htmlEnc(item) + '</span>\n' + desc + '<span class="message">' + util.htmlEnc(suite.error.message) + '</span>');
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
    write: function(text) {
      this.output.push(text);
      if (this.writeStream) {
        this.writeStream.write(text);
      }
    },
    writeLine: function(text) {
      this.write(text + '\n')
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
      var suites = this.suites;
      for (var i = 0, len = suites.length; i < len; i++) {
        var suite = suites[i];
        suite.runner = self;
        suite.startTime = Date.now();
        suite.setup();
        self.logResult('#description', suite);
        //allows us to do BDD style tests within each test case
        var it = function(desc, fn) {
          suite.desc = desc;
          fn.call(self);
          suite.desc = null;
        };
        forEach(suite.testCases, function(name, fn, i) {
          var startTime = Date.now();
          if (suite.noCatch) {
            suite.beforeEach();
            fn.call(suite, name, i);
            suite.afterEach();
          } else {
            try {
              suite.beforeEach();
              fn.call(suite, it);
              suite.afterEach();
            } catch(e) {
              suite.error = e;
            }
          }
          var endTime = Date.now();
          self.logResult(name, suite, endTime - startTime);
          return (suite.error) ? false : null;
        });
        suite.teardown();
        suite.endTime = Date.now();
        this.logResult('#summary', suite, suite.endTime - suite.startTime);
        if (suite.error) break;
      }
      if (this.writeStream) {
        this.writeStream.end();
      }
      return this.output.join('');
    }
  });

});