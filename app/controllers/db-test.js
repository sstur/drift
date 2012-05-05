/*global app */
app.on('ready', function(require) {
  "use strict";

  var localdb = require('localdb');

  app.route('/db-test', function(req, res) {
    var db = localdb.open('data/test.db');
    db.createTable('test', {name: ['TEXT', 'NOT NULL']});
    res.die(db.query('select * from test'));
  });

});