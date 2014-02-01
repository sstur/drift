/*!
 * This should be built into model
 *   model should pass a normalized representation of a table to sql adapter
 */
/*global app, define */
define('model-create', function(require, exports, module) {
  "use strict";

  var database = require(app.cfg('models/database'));
  var Model = require('model').Model;

  var typeMap = {
    //number will map to int because it's likely determined by type inference
    'number': 'int(10)',
    'boolean': 'bit(1)',
    'string': 'varchar(255)',
    'text': 'text',
    'int': 'int(10)',
    'float': 'real',
    'date': 'timestamp',
    'json': 'text'
  };

  Model.prototype.createTable = function(opts) {
    var model = this;
    var db = database.open();
    if (opts.drop) {
      db.exec('DROP TABLE IF EXISTS ' + q(model.tableName));
    }
    var fieldDefs = [];
    forEach(model.fields, function(name, def) {
      var type = typeMap[def.type];
      var str = q(name) + ' ' + type;
      if (name == model.idField) {
        if (type == 'int(10)') {
          str += ' unsigned';
        }
        str += ' NOT NULL';
        if (model.autoIncrement !== false) {
          str += ' AUTO_INCREMENT';
        }
      }
      fieldDefs.push(str);
    });
    fieldDefs.push('PRIMARY KEY (' + q(model.idField) + ')');
    var sql = 'CREATE TABLE ' + q(model.tableName) + ' (' + fieldDefs.join(', ') + ')';
    if (typeof model.autoIncrement == 'number') {
      sql += ' AUTO_INCREMENT=' + model.autoIncrement;
    }
    sql += ' DEFAULT CHARSET=utf8';
    db.exec(sql);
  };

  Model.prototype.dropTable = function() {
    var model = this;
    var db = database.open();
    db.exec('DROP TABLE IF EXISTS ' + q(model.tableName));
  };

  function q(identifier) {
    return '`' + identifier + '`';
  }

});