/*global app, define */
app.on('ready', function(require) {
  "use strict";

  app.route('/members/home/home', function(req, res) {
    res.send('members/home', {});
  });


});