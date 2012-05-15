/*global app, define */
app.on('ready', function(require) {
  "use strict";

  app.route('/reseller/home/home', function(req, res) {
    var error = req.params('error');
    res.send('reseller/login', {action: '/reseller/home/reseller_login', error: error});
  });


});