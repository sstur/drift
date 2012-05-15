(function(require) {
  "use strict";

  var Request = require('wsh-request');
  var Response = require('wsh-response');
  var Messenger = require('messenger');

  var wsh = global['WScript'];
  //filesystem path including trailing slash
  var basePath = global.basePath = String(wsh.scriptFullName).replace(/[^\\]+\\build\\.*$/, '');
  var messenger = new Messenger(wsh.stdin, wsh.stdout);

  //expose messenger for modules to use
  app.messenger = messenger;

  messenger.notify('ready'); //let parent know we're ready

  app.emit('ready', require);

  while(messenger.query() == 'go') {
    try {
      app.route(new Request(), new Response());
    } catch(e) {
      if (e instanceof Response) {
        messenger.send('done', e.response);
        continue;
      } else {
        throw e;
      }
    }
    throw new Error('Router returned without ending request');
  }

})(app.require);