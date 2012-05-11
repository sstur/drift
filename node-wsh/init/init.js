(function(require) {
  "use strict";

  var Messenger = require('messenger');
  var Request = require('node-request');
  var Response = require('node-response');

  var wsh = global['WScript'];
  //filesystem path including trailing slash
  var basePath = global.basePath = String(wsh.scriptFullName).replace(/[^\\]+\\build\\.*$/, '');
  var messenger = new Messenger(wsh.stdin, wsh.stdout);

  //expose messenger for modules to use
  app.messenger = messenger;

  app.emit('ready', require);

  var status = 'running';
  while(status != 'exit') {
    var request = messenger.send('get-request');

    try {
      app.route(new Request(), new Response());
    } catch(e) {
      if (e instanceof Response) {
        status = messenger.send('done', e.response);
        continue;
      } else {
        throw e;
      }
    }

    throw new Error('Router returned without ending request');

  }

})(app.require);