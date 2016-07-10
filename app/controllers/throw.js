/*global app, define */
app.on('ready', function() {
  'use strict';

  app.route('/throw', function(req, res) {
    var c = ({}).a.b;
    res.end(c);
  });

});
