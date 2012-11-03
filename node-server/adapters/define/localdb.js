/*global global, require, module, exports, app, Fiber */

var sync = Fiber.fiberize;

var dbi = require('node-dbi')
  , DBWrapper = dbi.DBWrapper
  , DBExpr = dbi.DBExpr;

var asyncMethodList = 'connect close query fetchAll fetchRow fetchCol fetchOne insert update remove'.split(' ');
//var syncMethodList = 'escape isConnected getSelect'.split(' ');
var syncMethods = {}, proto = DBWrapper.prototype;
for (var n in proto) {
  if (n.charAt(0) != '_') {
    syncMethods[n] = (~asyncMethodList.indexOf(n)) ? sync(proto[n]) : proto[n];
  }
}

/**
 * Local (file-based) relational db adapter
 *  - uses sqlite3 with node-dbi adapter
 */
app.define('localdb', function(require, exports, module) {
  "use strict";

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

  function DBWrapper(type, opts) {
    this.type = type;
    this.opts = opts;
    this._super = new dbi.DBWrapper(type, opts);
  }

  var methods = Object.keys(syncMethods);
  methods.forEach(function(method) {
    DBWrapper.prototype[method] = function() {
      return syncMethods[method].apply(this._super, arguments);
    };
  });

  DBWrapper.prototype.createTable = function(tableName, fields) {
    var sql = getTableCreationSql(tableName, fields);
    return this.query(sql, null);
  };


  exports.DBExpr = DBExpr;
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


});