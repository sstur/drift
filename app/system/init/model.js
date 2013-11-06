/*global app */
app.on('init', function(require) {
  "use strict";
  var Model = require('model').Model;

  var models = app.models = {};

  app.addModel = function(name, config) {
    config.name = name;
    return models[name] = new Model(config);
  };

  app.getModel = function(name) {
    return models[name];
  };

});