(function() {
  "use strict";

  var fs = require('fs');
  var dbm = require('db-migrate');

  var config = readJSON('config.json');
  var schema = readJSON('../schemas/latest.json');

  module.exports = function run(env, callback) {
    connect(env, function(error, db) {
      if (error) {
        callback(error);
        return;
      }
      var tables = objectToArray(schema.tables);
      var next = createNext(tables.length, function(error) {
        if (!error) db.close();
        callback(error);
      });
      tables.forEach(function(table) {
        if (table.name.charAt(0) == '_') return void next();
        db.dropTable(table.name, {ifExists: true}, function(error) {
          if (error) throw error;
          createTable(db, table, next);
        });
      });
    });
  };

  function connect(env, callback) {
    env = env || Object.keys(config)[0];
    var dbConfig = config[env].db;
    if (!dbConfig) {
      callback(new Error('Invalid database selected'));
      return;
    }
    dbm.connect(dbConfig, function(error, migrator) {
      var db = migrator ? migrator.driver : null;
      callback(error, db);
    });
  }

  function createTable(db, table, callback) {
    //db-migrate takes options in camel case
    table = camelize(table);
    var tableName = table.name;
    var columns = table.columns;
    //normalize column details
    Object.keys(columns).forEach(function(colName) {
      var column = columns[colName];
      if (typeof column == 'string') {
        column = columns[colName] = {type: column};
      }
      var options = column.options || '';
      options = flagsToOptions(options.split(' '));
      extend(column, camelize(options));
      if (colName === table.primaryKey) {
        column.primaryKey = true;
      }
    });
    //create table and optionally indexes
    db.createTable(tableName, table, function(error) {
      if (error) throw error;
      if (table.indexes) {
        var indexes = table.indexes;
        var indexNames = Object.keys(indexes);
        var next = createNext(indexNames.length, callback);
        indexNames.forEach(function(indexName) {
          var fields = objectToArray(indexes[indexName]);
          db.addIndex(tableName, indexName, fields, next);
        });
      } else {
        callback();
      }
    });
  }


  /*!
   * Helpers
   */

  function createNext(total, callback) {
    var count = 0;
    return function(error) {
      if (error) throw error;
      if (++count == total) {
        callback();
      }
    };
  }


  function extend() {
    var args = Array.prototype.slice.call(arguments);
    var dest = args.shift() || {};
    args.forEach(function(src) {
      if (!src) return;
      Object.keys(src).forEach(function(key) {
        dest[key] = src[key];
      });
    });
    return dest;
  }


  function objectToArray(object) {
    return Object.keys(object).map(function(name) {
      var item = object[name];
      if (typeof item == 'string') {
        item = {value: item};
      }
      item.name = name;
      return item;
    });
  }


  function flagsToOptions(flags) {
    return flags.reduce(function(opts, name) {
      if (name) opts[name] = 1;
      return opts;
    }, {});
  }


  function camelize(obj) {
    var result = {};
    Object.keys(obj).forEach(function(key) {
      var camel = key.replace(/_./g, function(s) {
        return s.slice(1).toUpperCase();
      });
      result[camel] = obj[key];
    });
    return result;
  }


  function readJSON(path) {
    var text = fs.readFileSync(__dirname + '/' + path);
    try {
      var result = JSON.parse(text);
    } catch(e) {
      throw new Error('Error reading JSON file: ' + path);
    }
    return result;
  }

})();