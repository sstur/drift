/*global app, define */
define('model', function(require, exports) {
  "use strict";
  var util = require('util');
  var mysql = require('mysql');

  var _hasOwnProperty = Object.prototype.hasOwnProperty;

  var COMPARATORS = {
    $lt: '<',
    $gt: '>',
    $eq: '=',
    $ne: '!=',
    $in: 'IN',
    $nin: 'NOT IN'
  };

  function Model(opts) {
    if (!(this instanceof Model)) return new Model(opts);
    this.tableName = opts.tableName || error('Invalid Table Name');
    var fields = this.fields = opts.fields || {};
    this.fieldNames = Object.keys(fields);
    this.idField = opts.idField || getFirstKey(fields) || error('Invalid ID Field');
    var jsonFields = this.jsonFields = [];
    forEach(fields, function(name, definition) {
      if (definition && definition.type == 'json') {
        jsonFields.push(name);
      }
    });
    this.fieldMap = opts.fieldMap || {};
    this.reverseFieldMap = invert(opts.fieldMap);
    this.dbFieldNames = Object.keys(this._mapToDB(fields));
    this.dbIdField = opts.dbIdField || this.reverseFieldMap[this.idField] || this.idField;
    this.autoIncrement = opts.autoIncrement;
    if (opts.classMethods) {
      util.extend(this, opts.classMethods);
    }
    //record instances are of self class
    function RecordClass(data) {
      return Record.apply(this, arguments);
    }
    util.inherits(RecordClass, Record);
    if (opts.instanceMethods) {
      util.extend(RecordClass.prototype, opts.instanceMethods);
    }
    RecordClass.prototype._model = this;
    var getters = opts.getters;
    if (getters) {
      //this makes specified getters available in view engine
      RecordClass.prototype._get = function(key) {
        var getter = getters[key];
        return (getter && this[getter]) ? this[getter]() : null;
      };
    }
    this.RecordClass = RecordClass;
  }
  exports.Model = Model;

  util.extend(Model.prototype, {
    _mapFromDB: function(obj) {
      return mapKeys(obj, this.fieldMap);
    },
    _mapToDB: function(obj) {
      return mapKeys(obj, this.reverseFieldMap);
    },
    _reviveFields: function(rec) {
      this.jsonFields.forEach(function(fieldName) {
        revive(rec, fieldName);
      });
    },
    create: function(rec) {
      rec = this._mapFromDB(rec);
      this._reviveFields(rec);
      return new this.RecordClass(rec);
    },
    insert: function(data) {
      var instance = this.create(data);
      instance.insert();
      return instance;
    },
    updateWhere: function(data, params, opts) {
      params = this._mapToDB(params);
      opts = opts || {};
      var built = buildUpdateWhere(this, data, params);
      var db = mysql.open();
      return db.exec(built.sql, built.values, opts.returnAffected);
    },
    find: function(params, opts) {
      params = this._mapToDB(params);
      opts = opts || {};
      opts.limit = 1;
      var built = buildSelect(this, params, opts);
      var db = mysql.open();
      var rec = db.query(built.sql, built.values).getOne();
      return rec ? this.create(rec) : null;
    },
    findAll: function(params, opts) {
      params = params ? this._mapToDB(params) : {};
      var built = buildSelect(this, params, opts);
      var db = mysql.open();
      var query = db.query(built.sql, built.values);
      var results = [], self = this;
      query.each(function(rec) {
        results.push(self.create(rec));
      });
      return results;
    },
    findEach: function(params, opts, fn) {
      if (typeof opts == 'function') {
        fn = opts;
        opts = {};
      }
      params = params ? this._mapToDB(params) : {};
      var built = buildSelect(this, params, opts);
      var db = mysql.open();
      var query = db.query(built.sql, built.values);
      var self = this;
      var i = 0;
      query.each(function(rec) {
        fn(self.create(rec), i++);
      });
    },
    count: function(params) {
      params = this._mapToDB(params);
      var built = buildCount(this, params);
      var db = mysql.open();
      var rec = db.query(built.sql, built.values).getOne();
      return rec.count;
    }
  });

  function Record(data) {
    util.extend(this, data);
    if (this.init) this.init();
  }
  exports.Record = Record;

  util.extend(Record.prototype, {
    update: function(data) {
      var model = this._model;
      if (data) {
        //filter data
        data = filterObject(data, model.fieldNames);
        //remove id field
        delete data[model.idField];
        util.extend(this, data);
      } else {
        //get data from this
        data = filterObject(this, model.fieldNames);
        delete data[model.idField];
      }
      //stringify json fields
      model.jsonFields.forEach(function(fieldName) {
        if (fieldName in data) {
          data[fieldName] = util.stringify(data[fieldName]);
        }
      });
      var built = buildUpdate(this, model._mapToDB(data));
      var db = mysql.open();
      db.exec(built.sql, built.values);
    },
    insert: function() {
      var model = this._model;
      //filter data
      var data = filterObject(this, model.fieldNames);
      //remove id field
      if (model.autoIncrement !== false) {
        delete data[model.idField];
      }
      //stringify json fields
      model.jsonFields.forEach(function(fieldName) {
        if (fieldName in data) {
          data[fieldName] = util.stringify(data[fieldName]);
        }
      });
      var db = mysql.open();
      this[model.idField] = db.insert(model.tableName, model._mapToDB(data), true);
    },
    toJSON: function() {
      var result = {}, self = this;
      forEach(this._model.fields, function(name, def) {
        result[name] = (def && def.type == 'json') ? util.clone(self[name]) : self[name];
      });
      return result;
    }
  });


  /*!
   * Helpers
   */

  function buildSelect(model, params, opts) {
    opts = opts || {};
    var fields = model.fields, dbFieldNames = model.dbFieldNames;
    //optionally select only certain fields
    if (opts.fields && opts.fields.length) {
      fields = filterObject(fields, opts.fields);
      dbFieldNames = Object.keys(model._mapToDB(fields));
    }
    var fieldNames = '`' + dbFieldNames.join('`, `') + '`';
    var sql = 'SELECT ' + fieldNames + ' FROM `' + model.tableName + '`';
    var where = buildWhere(params);
    if (where.terms.length) {
      sql += ' WHERE ' + where.terms.join(' AND ');
    }
    var values = where.values;
    if (opts.search) {
      var search = model._mapToDB(opts.search.fields);
      var searchTerms = [];
      forEach(search, function(field, text) {
        values.push(normalizeSearchText(text));
        searchTerms.push('`' + field + '` LIKE ?');
      });
      sql += ' AND (' + searchTerms.join(' OR ') + ')';
    }
    if (opts.orderBy && (opts.orderBy in fields)) {
      var orderBy = model.reverseFieldMap[opts.orderBy] || opts.orderBy;
      sql += ' ORDER BY `' + orderBy + '`' + (opts.dir ? ' ' + opts.dir.toUpperCase() : '');
    }
    if (opts.limit || opts.offset) sql += ' LIMIT ' + (opts.limit || '18446744073709551615'); //2^64-1
    if (opts.offset) sql += ' OFFSET ' + opts.offset;
    return {sql: sql, values: values};
  }

  function buildCount(model, params) {
    var sql = 'SELECT COUNT(`' + model.dbIdField + '`) AS `count` FROM `' + model.tableName + '`';
    var where = buildWhere(params);
    if (where.terms.length) {
      sql += ' WHERE ' + where.terms.join(' AND ');
    }
    return {sql: sql, values: where.values};
  }

  function buildUpdate(instance, data) {
    var terms = [];
    var values = [];
    forEach(data, function(n, val) {
      terms.push('`' + n + '` = ?');
      values.push(val);
    });
    var model = instance._model;
    var sql = 'UPDATE `' + model.tableName + '` SET ' + terms.join(', ') + ' WHERE `' + model.dbIdField + '` = ?';
    values.push(instance[model.idField]);
    return {sql: sql, values: values};
  }

  function buildUpdateWhere(model, data, params) {
    var terms = [];
    var values = [];
    forEach(data, function(n, val) {
      terms.push('`' + n + '` = ?');
      values.push(val);
    });
    var sql = 'UPDATE `' + model.tableName + '` SET ' + terms.join(', ');
    var where = buildWhere(params);
    if (where.terms.length) {
      sql += ' WHERE ' + where.terms.join(' AND ');
      values.push.apply(values, where.values);
    }
    return {sql: sql, values: values};
  }

  function buildWhere(params) {
    var terms = [];
    var values = [];
    forEach(params, function(fieldName, term) {
      term = parseTerm(term);
      terms.push('`' + fieldName + '` ' + term.sql);
      values.push.apply(values, term.values);
    });
    return {terms: terms, values: values};
  }

  function isQuery(term) {
    if (term == null) return false;
    var isPlainObject = (term.toString === Object.prototype.toString);
    return isPlainObject && Object.keys(term).join('').match(/^(\$\w+)+$/);
  }

  function parseTerm(term) {
    //if term is value (including Date/Buffer) vs a Query
    if (!isQuery(term)) term = {$eq: term};
    var key = getFirstKey(term), op = COMPARATORS[key], value = term[key];
    if (Array.isArray(value)) {
      var sql = op + ' (' + new Array(value.length + 1).join('?').split('').join(', ') + ')';
      var values = value;
    } else {
      sql = op + ' ?';
      values = [value];
    }
    return {sql: sql, values: values};
  }

  function error(str) {
    throw new Error('Model Error; ' + str);
  }

  function invert(obj) {
    var result = {};
    forEach(obj, function(key, val) {
      result[val] = key;
    });
    return result;
  }

  function mapKeys(obj, map) {
    var keys = Object.keys(obj), result = {};
    keys.forEach(function(key) {
      var value = obj[key];
      if (key in map) key = map[key];
      result[key] = value;
    });
    return result;
  }

  function filterObject(obj, keys) {
    var result = {};
    keys.forEach(function(key) {
      if (_hasOwnProperty.call(obj, key)) {
        result[key] = obj[key];
      }
    });
    return result;
  }

  function getFirstKey(obj) {
    for (var key in obj) {
      if (_hasOwnProperty.call(obj, key)) return key;
    }
    return null;
  }

  function normalizeSearchText(text) {
    return '%' + text.toLowerCase().replace(/[^\w]+/g, ' ').trim().replace(/\s+/g, '%') + '%';
  }

  function revive(obj, prop) {
    var data = obj[prop];
    if (typeof data == 'string') {
      try {
        data = obj[prop] = util.parse(data || '{}'); //catch empty string
      } catch(e) {
        data = {};
      }
    }
    return data || (obj[prop] = {}); //catch null
  }

});