/**
 * todo: handle errors: PROTOCOL_CONNECTION_LOST
 * todo: connection pooling
 */
/*global require, app, adapter, Buffer */
var mysql = require('mysql');
var SqlString = require('mysql/lib/protocol/SqlString');

var TIMEZONE = '+00:00';

adapter.define('mysql', function(require, exports) {
  "use strict";

  var util = require('util');

  //var DBWrapper = dbi.DBWrapper;

  //function NewDBWrapper(type, opts) {
  //  DBWrapper.apply(this, arguments);
  //}
  //util.inherits(NewDBWrapper, DBWrapper);
  //
  //var asyncMethods = 'connect close query fetchAll fetchRow fetchCol fetchOne insert update remove'.split(' ');
  //asyncMethods.split(' ').forEach(function(methodName) {
  //  NewDBWrapper.prototype[methodName + '_'] = DBWrapper.prototype[methodName];
  //});
  //
  //NewDBWrapper.prototype.createTable = function(tableName, fields) {
  //  var sql = getTableCreationSql(tableName, fields);
  //  return this.query(sql, null);
  //};



  var RE_NONASCII = /[\x00-\x1f\x7f-\xff\u0100-\uffff]+/g;
  var REG_SQL_ENTITIES = /('(''|[^'])*'|\[(\\.|[^\]])*\]|\$\d+|\?|[A-Z_]+\(\))/gim;
  var REG_DATE_1 = /^(\d{4})-(\d{2})-(\d{2})\s*T?([\d:]+)(\.\d+)?($|[Z\s+-].*)$/i;
  var REG_DATE_2 = /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/;


  var namedConnections = app.cfg('mysql/connections') || {};
  var connections = [];

  function Connection(config) {
    this.dbConnection = mysql.createConnection({
      host: config.hostname || config.server || 'localhost',
      user: config.username,
      password: config.password,
      database: config.database,
      //dateStrings: true,
      timezone: TIMEZONE,
      charset: 'UTF8_GENERAL_CI'
    });
    //todo: postpone open?
    try {
      this.open();
    } catch(e) {
      throw new Error('Error opening MySQL connection:\n' + e.message);
    }
    connections.push(this);
  }

  util.extend(Connection.prototype, {
    open_: function(callback) {
      this.dbConnection.connect(function(err) {
        if (!err && app.cfg('debug_open_connections')) {
          var openConnections = app.data('debug:open_connections') || 0;
          app.data('debug:open_connections', openConnections + 1);
        }
        callback(err);
      });
    },
    query: function(str /*, [params], [opts], [func] */) {
      var args = toArray(arguments);
      if (typeof args[args.length - 1] == 'function') {
        var func = args.pop();
      }
      var opts = (args.length > 2) ? args.pop() : {};
      var params = (args.length > 1) ? args.pop() : [];
      var query = new Query(this.dbConnection, str, params, opts);
      if (func) query.each(func);
      return query;
    },
    //todo: use driver to quote identifiers
    insert_: function(table, data, returnId, callback) {
      var sql = [], names = [], values = [];
      Object.keys(data).forEach(function(key) {
        sql.push('?');
        names.push('`' + key + '`');
        values.push(data[key]);
      });
      sql = 'INSERT INTO `' + table + '` (' + names.join(', ') + ') VALUES (' + sql.join(', ') + ')';
      this.exec(sql, values, returnId, callback);
    },
    exec_: function(str, params, returnAffected, callback) {
      var dbConnection = this.dbConnection;
      var sql = buildSQL(str, params);
      //util.log(3, sql, 'mysql');
      dbConnection.query(str, params, function(err, result) {
        if (err) {
          //err.message = 'SQL Statement Could not be executed:\n' + sql + '\n' + err.message;
          return callback(err);
        }
        if (!returnAffected) {
          return callback();
        }
        if (sql.match(/^INSERT/i)) {
          //todo: should we be using parseInt here?
          var id = parseInt(result.insertId, 10) || null;
          callback(null, id);
        } else {
          //actually we could use result.affectedRows here but it's not available cross-platform
          callback(new Error('Cannot determine number of rows affected; method not available.'));
        }
      });
    },
    close_: function(callback) {
      var dbConnection = this.dbConnection;
      dbConnection.end(function(err) {
        if (err) return callback(err);
        if (app.cfg('debug_open_connections')) {
          var openConnections = app.data('debug:open_connections') || 1;
          app.data('debug:open_connections', openConnections - 1);
        }
      });
    }
  });


  function Query(dbConnection, str, params, opts) {
    this.dbConnection = dbConnection;
    this.str = str;
    this.params = params;
    this.opts = opts || {};
  }

  util.extend(Query.prototype, {
    //todo: split this into normalize and build; use driver for build step
    getSQL: function() {
      return this.sql || (this.sql = buildSQL(this.str, this.params));
    },
    getAll_: function(callback) {
      getAll(this, callback);
    },
    getOne_: function(callback) {
      getAll(this, function(err, rows) {
        rows = rows || [];
        return callback(err, rows[0]);
      });
    },
    each: function(func, callback) {
      var rows = this.getAll();
      //array.some will stop iterating if true is returned
      rows.some(function(row, i) {
        return (func(row, i) === false);
      });
      return this;
    }
  });


  function getAll(query, callback) {
    var sql = query.getSQL();
    //util.log(3, sql, 'mysql');
    query.dbConnection.query(sql, function(err, rows, fields) {
      if (err) {
        //err.message = 'SQL Statement Could not be executed:\n' + sql + '\n' + err.message;
        return callback(err);
      }
      if (query.opts.array) {
        rows = rows.map(function(row) {
          return fields.map(function(field) {
            return row[field.name];
          });
        });
      }
      callback(null, rows);
    });
  }

  function buildSQL(str, params) {
    var sql = String(str), arr = [0].concat(params);
    //escape array values
    forEach(arr, function(i, val) {
      arr[i] = toSQLVal(val);
    });
    var i = 0, j = arr.length, val, date = new Date();
    //sub out quoted literals and ? placeholders
    sql = sql.replace(REG_SQL_ENTITIES, function(s) {
      var c = s.substr(0, 1);
      if (c == "?") {
        val = arr[++i];
        s = (val == 'NULL') ? val : '$' + i;
      } else
      if (c == "$") {
        val = arr[Number.parseInt(s.substr(1))];
        if (val == 'NULL') {
          s = val;
        }
      } else
      if (c == "'") {
        arr[j] = s;
        s = '$' + (j++);
      }
      return s;
    });
    // MySQL will not allow syntax: SELECT * WHERE `foo` = NULL
    sql = sql.replace(/WHERE (.*)/, function(sql) {
      sql = sql.replace(/!= NULL/g, 'IS NOT NULL');
      sql = sql.replace(/= NULL/g, 'IS NULL');
      return sql;
    });
    //misc sql transforms
    sql = sql.replace(/\bNOW\(\)/ig, toSQLVal(date));
    //replace special CAST values
    sql = sql.replace(/(\w+)\(\$(\d)\)/, function(s, n, i) {
      var val = arr[Number.parseInt(i)];
      var sql = s.replace('$' + i, val);
      if (n == 'CAST_DATE') {
        sql = toSQLVal(parseDate(val.slice(1, -1)));
      }
      sql = sql.replace(/CAST_HEX\('((?:[0-9a-f]{2})+)'\)/ig, '0x$1');
      return sql;
    });
    //re-insert subbed-out entities
    sql = sql.replace(/\$(\d+)/g, function(s, i) {
      i = Number.parseInt(i);
      return arr[i];
    });
    return sql;
  }

  function toSQLVal(val) {
    if (val == null) {
      return 'NULL';
    }
    var type = typeof val;
    if (type == 'boolean') {
      return (val) ? 'true' : 'false';
    }
    if (type == 'number') {
      //the big number is 2^64-1; the max number for LIMIT
      return (isNaN(val)) ? 'NULL' : (isFinite(val) ? val.toString() : (val < 0 ? '-' : '') + '18446744073709551615');
    }
    if (val instanceof Date) {
      return "'" + formatDate(val) + "'";
    }
    if (Buffer.isBuffer(val)) {
      return "x'" + val.toString('hex') + "'";
    }
    if (Array.isArray(val) || type == 'object') {
      val = (val.toString) ? val.toString() : Object.prototype.toString.call(val);
    }
    return escSqlString(val);
  }

  function formatDate(date) {
    //Dates are stored in DB as UTC
    //format is: {yyyy}-{mm}-{dd} {HH}:{nn}:{ss}
    return date.getUTCFullYear() + '-' +
      pad(date.getUTCMonth() + 1) + '-' +
      pad(date.getUTCDate()) + ' ' +
      pad(date.getUTCHours()) + ':' +
      pad(date.getUTCMinutes()) + ':' +
      pad(date.getUTCSeconds());
  }

  function pad(n) {
    return ('0' + n).slice(-2);
  }

  function parseDate(input, /**String=*/ def) {
    if (input instanceof Date) {
      return new Date(input);
    }
    var str = String(input);
    //ISO 8601 / JSON-style date: "2008-12-13T16:08:32Z"
    str = str.replace(REG_DATE_1, '$1/$2/$3 $4$6');
    //YYYY-MM-DD
    str = str.replace(REG_DATE_2, '$1/$2/$3');
    var i = Date.parse(str);
    if (isFinite(i)) {
      return new Date(i);
    }
    if (arguments.length > 1) {
      return def;
    }
    throw new Error('Not a date: ' + input);
  }

  function escSqlString(value) {
    return SqlString.escape(value, false, TIMEZONE);
  }



  //  'CREATE TABLE {tableName} ( ',
  //  '"id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, ',
  //  '"first_name" TEXT NOT NULL, ',
  //  '"last_name" TEXT NOT NULL, ',
  //  '"nickname" TEXT, ',
  //  '"birth_date" TEXT NOT NULL, ',
  //  '"num_children" INTEGER NOT NULL DEFAULT (0), ',
  //  '"enabled" INTEGER NOT NULL );'

  //var getTableCreationSql = function(tableName, fields) {
  //  var defs = [];
  //  for (var n in fields) {
  //    var attrs = fields[n], parts = [];
  //    parts.push('"' + n + '"');
  //    for (var i = 0; i < attrs.length; i++) {
  //      parts.push(attrs[i]);
  //    }
  //    defs.push(parts.join(' '));
  //  }
  //  return 'CREATE TABLE ' + tableName + ' (' + defs.join(', ') + ');';
  //};



  //todo: connections should be closed on request end/disconnect
  app.on('end', function() {
    forEach(connections, function(i, connection) {
      connection.close();
    });
  });

  exports.Query = Query;
  exports.Connection = Connection;

  exports.open = function(name) {
    var config = namedConnections[name || 'default'];
    if (!config) {
      throw new Error('MySQL: Invalid Named Connection: ' + name);
    }
    return new Connection(config);
  };


});