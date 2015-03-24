/**
 * todo: optionally, include stack in http response
 */
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
    //loadOption will mutate cfg, so we first shallow clone it
    cfg = Object.assign({}, cfg);
    this.loadOption(cfg, 'name', 'unnamed');
    this.loadOption(cfg, 'description', this.name);
    this.loadOption(cfg, 'setup', noop);
    this.loadOption(cfg, 'teardown', noop);
    this.loadOption(cfg, 'beforeEach', noop);
    this.loadOption(cfg, 'afterEach', noop);
    this.loadOption(cfg, 'noCatch', false);
    this.testCases = cfg;
  }

  Object.assign(TestSuite.prototype, {
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

  Object.assign(TestRunner.prototype, {
    addSuite: function(suite) {
      var suites = this.suites;
      var array = Array.isArray(suite) ? suite : [suite];
      array.forEach(function(cfg) {
        suites.push(new TestSuite(cfg));
      });
    },
    format_html: function(logType, suite, testCaseName, time) {
      var firstTest = (this.output.length === 0);
      if (firstTest) {
        this.write('<style>body { margin: 20px } h1 { margin: 0; font-size: 120%; font-family: "Helvetica Neue", Helvetica, "Myriad Pro", "Lucida Grande", sans-serif; text-transform: uppercase } pre { margin: 10px; font-family: Consolas, "Liberation Mono", Courier, monospace; } .pass { color: #090 } .fail { color: #900 } .message { display: block; background: #eee ; overflow-x: auto } /*.message:before { display: block; float: left; content: "    "; height: 100% }*/</style>');
        this.write('<body>');
      }
      if (logType == 'description') {
        if (!firstTest) {
          this.write('</pre></code>');
        }
        this.write('<h1>' + htmlEnc(suite.description) + '</h1>');
        this.write('<pre><code>');
      } else
      if (logType == 'summary') {
        this.writeLine('Time Elapsed: ' + suite.timeElapsed + 'ms</span>');
      } else
      if (logType == 'success') {
        this.writeLine('<span class="pass">✔ PASS ››› </span><span class="name">' + htmlEnc(testCaseName) + ' [' + time + ']</span>');
      } else {
        var specDesc = (suite.specDesc) ? '<span class="spec">it ' + htmlEnc(suite.specDesc) + '</span>\n' : '';
        var error = suite.error;
        var message = (!isPrimitive(error) && ('message' in error)) ? error.message : error;
        this.writeLine('<span class="fail">✖ FAIL ‹‹‹ </span><span class="name">' + htmlEnc(testCaseName) + '</span>\n' + specDesc + '<span class="message">' + htmlEnc(message) + '</span>');
      }
    },
    format_text: function(logType, suite, testCaseName, time) {
      if (!error) {
        this.writeLine('✔ PASS ››› ' + testCaseName + ' [' + time + ']');
      } else {
        var specDesc = (suite.specDesc) ? suite.specDesc + '\n' : '';
        this.writeLine('✖ FAIL ‹‹‹ ' + testCaseName + '\n' + specDesc + suite.error.message);
      }
    },
    write: function(text) {
      this.output.push(text);
      if (this.writeStream) {
        this.writeStream.write(text);
      }
    },
    writeLine: function(text) {
      this.write(text + '\n');
    },
    log: function() {
      var self = this;
      toArray(arguments).forEach(function(value) {
        var isObject = (Object(value) === value);
        var text = isObject ? util.inspect(value) : String(value);
        self.writeLine(self.format == 'html' ? htmlEnc(text) : text);
      });
    },
    run: function(opts) {
      opts = opts || {};
      //format can be specified on instantiation or here
      var format = this.format = opts.format || this.format || 'text';
      this.logResult = this['format_' + format];
      this.writeStream = opts.writeStream;
      var runner = this;
      forEach(this.suites, function(i, suite) {
        suite.runner = runner;
        suite.startTime = Date.now();
        suite.setup();
        runner.logResult('description', suite);
        //allows us to do BDD-style specs
        var it = function(specDesc, fn) {
          suite.specDesc = specDesc;
          fn.call(suite);
          suite.specDesc = null;
        };
        forEach(suite.testCases, function(caseName, testCase) {
          //suite.testCase = name;
          var startTime = Date.now();
          //this actually shouldn't be necessary because we halt on error
          delete suite.error;
          if (suite.noCatch) {
            suite.beforeEach();
            testCase.call(suite, it);
            suite.afterEach();
          } else {
            try {
              suite.beforeEach();
              testCase.call(suite, it);
              suite.afterEach();
            } catch(e) {
              //todo: should this be in response instead?
              if (e instanceof Error && e.stack) {
                console.log('Test threw:');
                console.log(e.stack);
              }
              suite.error = e;
            }
          }
          var endTime = Date.now();
          if ('error' in suite) {
            runner.logResult('error', suite, caseName, endTime - startTime);
            //don't continue
            return false;
          } else {
            runner.logResult('success', suite, caseName, endTime - startTime);
            //continue
            return true;
          }
        });
        suite.teardown();
        suite.endTime = Date.now();
        suite.timeElapsed = suite.endTime - suite.startTime;
        runner.logResult('summary', suite);
        return !suite.error;
      });
      if (this.writeStream) {
        this.writeStream.end();
      }
      return this.output.join('');
    }
  });

  function htmlEnc(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  }

});