/*global app, define */
app.on('ready', function(require) {
  "use strict";

  app.route('/system/home/login', function(req, res) {
    var error = req.params('error');
    res.send('system/login', {error: error});
  });

  app.route('POST:/members/member/member_login', function(req, res) {
    var un = req.post('member_username')
      , pw = req.post('member_password');
    if (un == 'member' && pw == 'password') {
      res.redirect('/members/home/home');
    } else {
      res.redirect('/system/home/login?error=1');
    }
  });


});