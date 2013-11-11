/*global app */
app.on('init', function(require) {
  "use strict";
  var util = require('util');

  // GET    /items -> Items.$index
  // GET    /items/new -> Items.$new
  // POST   /items -> Items.$create
  // GET    /items/:id -> Items.$show
  // GET    /items/:id/edit -> Items.$edit
  // POST   /items/:id -> Items.$update
  // POST   /items/:id/delete -> Items.$destroy

  var controllers = app.controllers = {};

  app.getController = function(name) {
    return controllers[name];
  };

  app.addController = function(name, config) {
    var path = config.resourcePath;

    var routeMap = {};
    routeMap['GET:' + path] = '$index';
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
          var id = controller.validateID(params.id);
          if (id == null) return;
        }
        params.id = id;
      }
      if (controller.authenticate) {
        controller.authenticate();
      }
      //id param, if it exists, gets special treatment here
      controller[action](req, res, id);
    }

    forEach(routeMap, function(url, action) {
      if (config[action]) {
        app.route(url, function(req, res) {
          route.call(this, action, req, res);
        });
      }
    });

  };

});