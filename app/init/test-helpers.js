/*global app, define */
app.on('init', function(require) {
  "use strict";

  var suites = [];
  var suitesByName = {};

  app.addTestSuite = function(name, cfg) {
    cfg.name = name;
    suites.push(cfg);
    suitesByName[name] = cfg;
  };

  app.getTestSuite = function(name) {
    if (name == null) {
      return suites;
    } else {
      return suitesByName[name];
    }
  };

});