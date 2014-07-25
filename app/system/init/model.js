/*global app */
app.on('init', function(require) {
  "use strict";

  var models = app.models = {};

  app.addModel = function(name, config) {
    config.name = name;
    //todo: move this out to the top level
    var Model = require('model').Model;
    return (models[name] = new Model(config));
  };

  app.getModel = function(name) {
    return models[name];
  };

});