/*global global, require, module, exports, app, adapter */
var dbi = require('node-dbi');

/**
 * Local (file-based) relational db adapter
 *  - uses sqlite3 via node-dbi adapter
 */
adapter.define('localdb', function(require, exports) {
  "use strict";

  var util = require('util');

  var OldDBWrapper = dbi.DBWrapper;

  function DBWrapper(type, opts) {
    OldDBWrapper.apply(this, arguments);
  }
  util.inherits(DBWrapper, OldDBWrapper);

  var asyncMethods = 'connect close query fetchAll fetchRow fetchCol fetchOne insert update remove'.split(' ');
  asyncMethods.split(' ').forEach(function(methodName) {
    DBWrapper.prototype[methodName + '_'] = OldDBWrapper.prototype[methodName];
  });

  DBWrapper.prototype.createTable = function(tableName, fields) {
    var sql = getTableCreationSql(tableName, fields);
    return this.query(sql, null);
  };

  exports.DBExpr = dbi.DBExpr;
  exports.DBWrapper = DBWrapper;

  var connections = {};
  exports.open = function(dbfile) {
    if (dbfile.indexOf('.') < 0) dbfile += '.db';
    if (dbfile.indexOf('/') < 0) dbfile = 'data/db/' + dbfile;
    var fullpath = app.mappath(dbfile), opts = {path: fullpath};
    var dbWrapper = connections[fullpath] || (connections[fullpath] = new DBWrapper('sqlite3', opts));
    if (!dbWrapper.isConnected()) {
      dbWrapper.connect();
    }
    return dbWrapper;
  };


  //  'CREATE TABLE {tableName} ( ',
  //  '"id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, ',
  //  '"first_name" TEXT NOT NULL, ',
  //  '"last_name" TEXT NOT NULL, ',
  //  '"nickname" TEXT, ',
  //  '"birth_date" TEXT NOT NULL, ',
  //  '"num_children" INTEGER NOT NULL DEFAULT (0), ',
  //  '"enabled" INTEGER NOT NULL );'

  var getTableCreationSql = function(tableName, fields) {
    var defs = [];
    for (var n in fields) {
      var attrs = fields[n], parts = [];
      parts.push('"' + n + '"');
      for (var i = 0; i < attrs.length; i++) {
        parts.push(attrs[i]);
      }
      defs.push(parts.join(' '));
    }
    return 'CREATE TABLE ' + tableName + ' (' + defs.join(', ') + ');';
  };


});