/*global app */
app.on('init', function(require) {
  "use strict";
  var util = require('util');

  var controllers = app.controllers = {};

  app.getController = function(name) {
    return controllers[name];
  };

  app.addController = function(name, config) {
    var path = config.resourcePath;

    var routeMap = {};
    routeMap['GET:' + path] = '$index';
    //note: /new will be checked before before /:id
    routeMap['GET:' + path + '/new'] = '$new';
    routeMap['POST:' + path] = '$create';
    routeMap['GET:' + path + '/:id'] = '$show';
    routeMap['GET:' + path + '/:id/edit'] = '$edit';
    routeMap['POST:' + path + '/:id'] = '$update';
    routeMap['POST:' + path + '/:id/delete'] = '$destroy';

    util.extend(routeMap, config.routeMap);

    function Controller(req, res, params) {
      this.request = req;
      this.response = res;
      this.params = params;
    }
    util.extend(Controller.prototype, config);

    controllers[name] = Controller;

    function route(action, req, res) {
      var params = this.params;
      var controller = new Controller(req, res, params);
      if (params.id != null) {
        if (controller.validateID) {
          params.id = controller.validateID(params.id);
          if (params.id == null) return;
        }
      }
      if (controller.authenticate) {
        controller.authenticate();
      }
      //id param, if it exists, gets special treatment here
      controller[action](req, res, params.id);
    }

    //todo: static routes should be attached first
    // so GET:/x/new will be called before GET:/x/:id
    forEach(routeMap, function(path, action) {
      if (Array.isArray(action)) {
        var opts = action[1];
        action = action[0];
      }
      if (config[action]) {
        app.route(path, function(req, res) {
          route.call(this, action, req, res);
        }, opts);
      }
    });

  };

});