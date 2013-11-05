/*global app */
app.on('init', function(require) {
  "use strict";

  // GET    /items -> Items.$index
  // GET    /items/new -> Items.$new
  // POST   /items -> Items.$create
  // GET    /items/:id -> Items.$show
  // GET    /items/:id/edit -> Items.$edit
  // POST   /items/:id -> Items.$update
  // POST   /items/:id/delete -> Items.$destroy

  var controllers = {};

  app.getController = function(name) {
    return controllers[name];
  };

  app.addController = function(name, config) {
    var path = config.resourcePath;

    function Controller(req, res) {
      this.request = req;
      this.response = res;
    }
    util.extend(Controller.prototype, config);

    controllers[name] = Controller;

    function route(action, req, res, id) {
      var controller = new Controller(req, res);
      if (id != null) {
        if (controller.validateID) {
          id = controller.validateID(id);
          if (id == null) return;
        }
        controller.id = id;
      }
      if (controller.authenticate) {
        controller.authenticate();
      }
      controller['$' + action](req, res, id);
    }

    if (config.$index) {
      app.route('GET:' + path, function(req, res) {
        route('index', req, res);
      });
    }

    if (config.$new) {
      app.route('GET:' + path + '/new', function(req, res) {
        route('new', req, res);
      });
    }

    if (config.$create) {
      app.route('POST:' + path, function(req, res) {
        route('create', req, res);
      });
    }

    if (config.$show) {
      app.route('GET:' + path + '/:id', function(req, res, id) {
        route('show', req, res, id);
      });
    }

    if (config.$edit) {
      app.route('GET:' + path + '/:id/edit', function(req, res, id) {
        route('edit', req, res, id);
      });
    }

    if (config.$update) {
      app.route('POST:' + path + '/:id', function(req, res, id) {
        route('update', req, res, id);
      });
    }

    if (config.$destroy) {
      app.route('POST:' + path + '/:id/delete', function(req, res, id) {
        route('destroy', req, res, id);
      });
    }

  };

});