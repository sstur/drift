(function() {
  "use strict";

  var Messenger = app.require('messenger');

  var wsh = global['WScript'];
  var messenger = new Messenger(wsh.stdin, wsh.stdout);

  //expose messenger for modules to use
  app.messenger = messenger;

  var status = 'running';
  while(status != 'exit') {
    var request = messenger.send('get-request');

    //todo: var req = new Request(), res = new Response(); app.route(req, res);

    var response = {
      status: '200',
      headers: {
        'content-type': 'text/plain'
      },
      body: JSON.stringify(request)
    };

    status = messenger.send('done', response);
  }

})();