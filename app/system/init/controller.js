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
      controller['$' + action](req, res, id);
    }

    if (config.$index) {
      app.route('GET:' + path, function(req, res) {
        route.call(this, 'index', req, res);
      });
    }

    if (config.$new) {
      app.route('GET:' + path + '/new', function(req, res) {
        route.call(this, 'new', req, res);
      });
    }

    if (config.$create) {
      app.route('POST:' + path, function(req, res) {
        route.call(this, 'create', req, res);
      });
    }

    if (config.$show) {
      app.route('GET:' + path + '/:id', function(req, res) {
        route.call(this, 'show', req, res);
      });
    }

    if (config.$edit) {
      app.route('GET:' + path + '/:id/edit', function(req, res) {
        route.call(this, 'edit', req, res);
      });
    }

    if (config.$update) {
      app.route('POST:' + path + '/:id', function(req, res) {
        route.call(this, 'update', req, res);
      });
    }

    if (config.$destroy) {
      app.route('POST:' + path + '/:id/delete', function(req, res) {
        route.call(this, 'destroy', req, res);
      });
    }

  };

});