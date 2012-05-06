/*global app */
app.on('ready', function(require) {
  "use strict";

  var localdb = require('localdb');

  app.route('/db-test', function(req, res) {
    var db = localdb.open('data/db/test.db');
    try {
      db.createTable('test', {name: ['TEXT', 'NOT NULL']});
    } catch(e) {
      if (e.message.indexOf('already exists') < 0) throw e;
    }
    console.log('created table');
    db.insert('test', {name: new Date().toJSON()});
    console.log('inserted record');
    var result = db.fetchAll('select * from test');
    console.log('finished query');
    res.die(result);
  });

});