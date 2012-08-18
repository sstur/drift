/*global app, define */
app.on('ready', function(require) {
  "use strict";

  app.route('/reseller/home/login', function(req, res) {
    var error = req.params('error');
    res.send('reseller/login', {error: error});
  });

  app.route('POST:/reseller/home/reseller_login', function(req, res) {
    req.debug(req.post());
    var un = req.post('reseller_username')
      , pw = req.post('reseller_password');
    if (un == 'user' && pw == 'password') {
      res.redirect('/reseller/home/home');
    } else {
      res.redirect('/reseller/home/login?error=1');
    }
  });


});