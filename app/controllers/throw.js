/*global app, define */
app.on('ready', function(require) {
  "use strict";

  app.route('/throw', function(req, res) {
    var c = ({}).a.b;
  });

});