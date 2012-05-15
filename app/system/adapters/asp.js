(function(require) {
  "use strict";

  var Request = require('iis-request');
  var Response = require('iis-response');

  var server = global['Server'];
  //filesystem path including trailing slash
  var basePath = global.basePath = server.mappath('/') + '\\';

  app.emit('ready', require);

  app.route(new Request(), new Response());
  throw new Error('Router returned without ending request');

})(app.require);