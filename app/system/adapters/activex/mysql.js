/*global app, define, Buffer, Enumerator, executeSqlAndReturnNumRowsAffected */
define('mysql', function(require, exports) {
  "use strict";

  var util = require('util');

  var RE_NONASCII = /[\x00-\x1f\x7f-\xff\u0100-\uffff]+/g;
  var RE_UNICODE = /[\x7f-\xff\u0100-\uffff]+/g;
  var connectionStrings = app.cfg('mysql/connections') || {};
  var adodbConnections = {};
  var connections = [];

  function Connection(connStr) {
    //todo: build connection string from connection uri
    this._cstr = connStr;
    this._conn = adodbConnections[connStr] || (adodbConnections[connStr] = new ActiveXObject('ADODB.Connection'));
    try {
      this.open();
    } catch(e) {
      var message = cleanError(e);
      //todo: log error?
      throw new Error('MySQL: Error opening Connection: ' + message);
    }
    connections.push(this);
  }

  util.extend(Connection.prototype, {
    open: function() {
      var conn = this._conn;
      if (conn.state == 0) {
        conn.open(this._cstr);
        if (app.cfg('debug_open_connections')) {
          var openConnections = app.data('debug:open_connections') || 0;
          app.data('debug:open_connections', openConnections + 1);
        }
      }
    },
    query: function(str /*, [params], [opts], [func] */) {
      var args = Array.prototype.slice.call(arguments);
      if (args[args.length - 1] == 'function') {
        var func = args.pop();
      }
      var opts = (args.length > 2) ? args.pop() : {};
      var params = (args.length > 1) ? args.pop() : [];
      var query = new Query(this._conn, str, params, opts);
      if (func) query.each(func);
      return query;
    },
    insert: function(table, data, returnAffected) {
      var sql = [], names = [], values = [];
      Object.keys(data).forEach(function(key) {
        sql.push('?');
        names.push('`' + key + '`');
        values.push(data[key]);
      });
      sql = 'INSERT INTO `' + table + '` (' + names.join(', ') + ') VALUES (' + sql.join(', ') + ')';
      return this.exec(sql, values, returnAffected);
    },
    exec: function(str, params, returnAffected) {
      var i, conn = this._conn, sql = buildSQL(str, params);
      util.log(3, sql, 'mysql');
      try {
        if (returnAffected) {
          i = executeSqlAndReturnNumRowsAffected(conn, sql);
        } else {
          conn.execute(sql, i, 128);
        }
      } catch (e) {
        throw new Error('SQL Statement Could not be executed. ' + cleanError(e) + '\r\n' + sql);
      }
      if (returnAffected) {
        if (String(sql).match(/^INSERT/i)) {
          sql = 'SELECT LAST_INSERT_ID() AS `val`';
        } else {
          return Number.parseInt(i);
        }
        this.query(sql, function(rec) {
          i = rec.val
        });
        return Number.parseInt(i);
      }
    },
    close: function() {
      var conn = this._conn;
      if (conn.state != 0) {
        conn.close();
        if (app.cfg('debug_open_connections')) {
          var openConnections = app.data('debug:open_connections') || 1;
          app.data('debug:open_connections', openConnections - 1);
        }
      }
    }
  });


  function Query(conn, str, params, opts) {
    this.str = str;
    this.conn = conn;
    this.params = params;
    this.opts = opts || {};
  }

  util.extend(Query.prototype, {
    getSQL: function() {
      return this.sql || (this.sql = buildSQL(this.str, this.params));
    },
    each: function(func) {
      var sql = this.getSQL();
      util.log(3, sql, 'mysql');
      try {
        var rs = this.conn.execute(sql);
      } catch (e) {
        throw new Error('SQL Statement Could not be executed. ' + cleanError(e) + '\r\n' + sql);
      }
      var abort = false, i = 0;
      if (rs.state) {
        var opts = this.opts;
        while (!rs.eof && !abort) {
          var rec = opts.array ? [] : {};
          enumerate(rs.fields, function(i, field) {
            var value = fromADO(field.value);
            if (opts.array) {
              rec.push(value);
            } else {
              rec[field.name] = value;
            }
          });
          abort = (func(rec, i++) === false);
          rs.movenext();
        }
        rs.close();
      }
      return this;
    },
    getOne: function() {
      var rec;
      this.each(function(r) {
        rec = r;
        return false;
      });
      return rec;
    },
    getAll: function() {
      var arr = [];
      this.each(function(r) {
        arr.push(r);
      });
      return arr;
    }
  });

  var REG_SQL_ENTITIES = /('(''|[^'])*'|\[(\\.|[^\]])*\]|\$\d+|\?|[A-Z_]+\(\))/gim;

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

  var REG_DATE_1 = /^(\d{4})-(\d{2})-(\d{2})\s*T?([\d:]+)(\.\d+)?($|[Z\s+-].*)$/i;
  var REG_DATE_2 = /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/;

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

  function parseUTCDate(input, /**String=*/ def) {
    var d = parseDate(input, def);
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds(), d.valueOf() % 1000));
  }

  function escSqlString(val) {
    val = val.replace(/[\0\n\r\b\t\\'\x1A]/g, function(s) {
      switch(s) {
        case "\0": return "\\0";
        case "\n": return "\\n";
        case "\r": return "\\r";
        case "\b": return "\\b";
        case "\t": return "\\t";
        case "\x1a": return "\\Z";
        default: return "\\" + s;
      }
    });
    if (!RE_NONASCII.test(val)) {
      return "'" + val + "'";
    }
    //do some funky encoding for unicode
    var pieces = [], lastPos = 0;
    val.replace(RE_NONASCII, function(ch, pos) {
      if (pos > lastPos) {
        pieces.push("'" + val.slice(lastPos, pos) + "'");
      }
      pieces.push("0x" + encodeURI(ch).replace(/%/g, ''));
      lastPos = pos + ch.length;
    });
    if (val.length > lastPos) {
      pieces.push("'" + val.slice(lastPos) + "'");
    }
    return "CONCAT(" + pieces.join(',') + ")";
  }

  //Convert from ADO Data Type
  function fromADO(val) {
    var type = typeof val;
    if (type == 'string' && RE_UNICODE.test(val)) {
      return tryDecodeMultibyte(val);
    } else
    if (type == 'date') {
      //Dates are stored in DB as UTC
      return parseUTCDate(val);
    } else
    if (type == 'unknown') {
      return new Buffer(val);
    }
    return val;
  }

  var REG_ESC_UNICODE = /%u([0-9a-f]{4})/ig;
  var WIN1252 = {"2013": "96", "2014": "97", "2018": "91", "2019": "92", "2020": "86", "2021": "87", "2022": "95",
    "2026": "85", "2030": "89", "2039": "8b", "2122": "99", "20AC": "80", "201A": "82", "0192": "83", "201E": "84",
    "02C6": "88", "0160": "8a", "0152": "8c", "017D": "8e", "201C": "93", "201D": "94", "02DC": "98", "0161": "9a",
    "203A": "9b", "0153": "9c", "017E": "9e", "0178": "9f"};

  function tryDecodeMultibyte(str) {
    var enc = escape(str).replace(REG_ESC_UNICODE, function(_, hex) {
      var code = WIN1252[hex.toUpperCase()];
      return code ? '%' + code : _;
    });
    try {
      return decodeURIComponent(enc);
    } catch(e) {
      return str;
    }
  }

  function enumerate(col, fn) {
    var i = 0;
    new Enumerator(col);
    for(var e = new Enumerator(col); !e.atEnd(); e.moveNext()) {
      if (fn.call(col, i++, e.item()) === false) break;
    }
  }

  function cleanError(e) {
    var message = (e && typeof e.message == 'string') ? e.message : '';
    return message.replace(/^(\[(.*?)\])+/, '');
  }

  app.on('end', function() {
    forEach(connections, function(i, connection) {
      connection.close();
    });
  });

  exports.open = function(name) {
    var connStr = connectionStrings[name || 'default'];
    if (!connStr) {
      throw new Error('MySQL: Invalid Named Connection: ' + name);
    }
    return new Connection(connStr);
  };

});