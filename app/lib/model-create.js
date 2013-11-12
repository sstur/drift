/*global app, define */
define('model-create', function(require, exports, module) {
  "use strict";

  var database = require(app.cfg('models/database'));
  var Model = require('model').Model;

  var typeMap = {
    'date': 'timestamp',
    'json': 'text',
    'text': 'text',
    'string': 'varchar(255)',
    'int': 'int(10)',
    'float': 'real',
    'boolean': 'bit(1)'
  };

  Model.prototype.createTable = function(opts) {
    var model = this;
    var db = database.open();
    if (opts.drop) {
      db.exec('DROP TABLE IF EXISTS ' + q(model.tableName));
    }
    var fieldDefs = [];
    forEach(model.fields, function(name, value) {
      var def = (value && typeof value == 'object') ? value : inferDef(value);
      var str = q(name) + ' ' + typeMap[def.type];
      if (name == model.idField) {
        str += ' unsigned NOT NULL';
        if (model.autoIncrement !== false) {
          str += ' AUTO_INCREMENT';
        }
      }
      fieldDefs.push(str);
    });
    fieldDefs.push('PRIMARY KEY (' + q(model.idField) + ')');
    var sql = 'CREATE TABLE ' + q(model.tableName) + ' (' + fieldDefs.join(', ') + ') AUTO_INCREMENT=123';
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

  function inferDef(value) {
    return {
      type: inferType(value),
      defaultValue: value
    }
  }

  function inferType(value) {
    var type = (value === null) ? 'null' : typeof value;
    if (type == 'object') {
      return (value instanceof Date) ? 'date' : 'json'
    } else
    if (type == 'boolean') {
      return 'boolean';
    } else
    if (type == 'string') {
      return 'string';
    } else {
      return 'int';
    }
  }

  function q(identifier) {
    return '`' + identifier + '`';
  }

});