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
    this.reverseFieldMap = invert(this.fieldMap);
    this.dbFieldNames = Object.keys(this._mapToDB(fields));
    this.dbIdField = opts.dbIdField || this._mapToDB(this.idField);
    this.autoIncrement = opts.autoIncrement;
    if (opts.classMethods) {
      util.extend(this, opts.classMethods);
    }
    //record instances are of class Record
    function Record(data) {
      return RecordBase.apply(this, arguments);
    }
    util.inherits(Record, RecordBase);
    if (opts.instanceMethods) {
      util.extend(Record.prototype, opts.instanceMethods);
    }
    Record.prototype._model = this;
    var getters = opts.getters;
    if (getters) {
      //this makes specified getters available in view engine
      Record.prototype._get = function(key) {
        var getter = getters[key];
        return (getter && this[getter]) ? this[getter]() : null;
      };
    }
    this.Record = Record;
  }
  exports.Model = Model;

  util.extend(Model.prototype, {
    _mapFromDB: function(obj) {
      var map = this.fieldMap;
      if (typeof obj == 'string') {
        return map[obj] || obj;
      }
      return mapKeys(obj, map);
    },
    _mapToDB: function(obj) {
      var map = this.reverseFieldMap;
      if (typeof obj == 'string') {
        return map[obj] || obj;
      }
      return mapKeys(obj, map);
    },
    _reviveFields: function(rec) {
      this.jsonFields.forEach(function(fieldName) {
        revive(rec, fieldName);
      });
    },
    _getTableField: function(field) {
      return '`' + this.tableName + '`.`' + this._mapToDB(field) + '`';
    },
    create: function(rec) {
      return new this.Record(rec);
    },
    createFromDB: function(rec) {
      rec = this._mapFromDB(rec);
      this._reviveFields(rec);
      return new this.Record(rec);
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
      return rec ? this.createFromDB(rec) : null;
    },
    findAll: function(params, opts, fn) {
      params = params ? this._mapToDB(params) : {};
      var built = buildSelect(this, params, opts);
      var db = mysql.open();
      var query = db.query(built.sql, built.values);
      var results = [], self = this, i = 0;
      query.each(function(rec) {
        rec = self.createFromDB(rec);
        fn ? fn(rec, i++) : results.push(rec);
      });
      return fn ? null : results;
    },
    count: function(params) {
      params = this._mapToDB(params);
      var built = buildCount(this, params);
      var db = mysql.open();
      var rec = db.query(built.sql, built.values).getOne();
      return rec.count;
    },
    //see JoinedSet#join for method signature
    join: function() {
      var joinedSet = new JoinedSet(this);
      return joinedSet.join.apply(joinedSet, arguments);
    }
  });

  function JoinedSet(model) {
    this.models = [];
    this.relationships = [];
    this.addModel(model);
  }
  exports.Joined = JoinedSet;

  util.extend(JoinedSet.prototype, {
    addModel: function(model) {
      this.models.push(model);
    },
    //this is kind of a funky way to allow us to do:
    // `Account.join(User).on('account.user_id', 'user.id')`
    // anything before the . is sugar, so it is the same as
    // `Account.join(User).on('user_id', 'id')`
    join: function(thatModel) {
      var self = this;
      return {
        on: function(thisField, thatField) {
          thisField = thisField.split('.').pop();
          thatField = thatField.split('.').pop();
          self.addModel(thatModel);
          self.relationships.push([thisField, thatField]);
          return self;
        }
      };
    },
    findAll: function(params, opts, fn) {
      var self = this;
      var built = this._buildSelect(params, opts);
      var db = mysql.open();
      var query = db.query(built.sql, built.values, {array: true});
      var results = [], i = 0;
      query.each(function(rec) {
        var items = self._parseResult(rec, built.map);
        fn ? fn.apply(null, items.concat(i++)) : results.push(items);
      });
      return fn ? null : results;
    },
    _buildSelect: function(params, opts) {
      opts = opts || {};
      var dbFieldMap = [];
      var selectTerms = [];
      this.models.forEach(function(model) {
        //todo: opts.fields should not use tableName
        var fieldNames = opts.fields && opts.fields[model.tableName] || model.fieldNames;
        fieldNames.forEach(function(field) {
          dbFieldMap.push([model, model._mapToDB(field)]);
          selectTerms.push(model._getTableField(field));
        });
      });
      var sql = 'SELECT ' + selectTerms.join(', ') + ' FROM ' + this._buildRelationships(opts);
      var where = buildWhere(params);
      if (where.terms.length) {
        sql += ' WHERE ' + where.terms.join(' AND ');
      }
      var values = where.values;
      //todo: opts.search
      if (opts.orderBy) {
        //todo: var orderBy = model._mapToDB(opts.orderBy);
        sql += ' ORDER BY `' + opts.orderBy + '`' + (opts.dir ? ' ' + opts.dir.toUpperCase() : '');
      }
      if (opts.limit || opts.offset) sql += ' LIMIT ' + (opts.limit || '18446744073709551615'); //2^64-1
      if (opts.offset) sql += ' OFFSET ' + opts.offset;
      return {sql: sql, values: values, map: dbFieldMap};
    },
    _buildRelationships: function(opts) {
      var rels = this.relationships;
      var models = this.models.slice();
      var thisModel = models.shift();
      var results = ['`' + thisModel.tableName + '`'];
      models.forEach(function(thatModel, i) {
        var rel = rels[i];
        results.push('INNER JOIN `' + thatModel.tableName + '` ON ' + thisModel._getTableField(rel[0]) + ' = ' + thatModel._getTableField(rel[1]));
        thisModel = thatModel;
      });
      return results.join(' ');
    },
    //create model instances from query result
    _parseResult: function(rec, map) {
      var resultSets = {};
      rec.forEach(function(value, i) {
        var model = map[i][0];
        var fieldName = map[i][1];
        var results = resultSets[model.tableName] || (resultSets[model.tableName] = {});
        results[fieldName] = value;
      });
      return this.models.map(function(model) {
        var data = resultSets[model.tableName] || {};
        return model.createFromDB(data);
      });
    }
  });

  function RecordBase(data) {
    util.extend(this, data);
    if (this.init) this.init();
  }
  exports.Record = RecordBase;

  util.extend(RecordBase.prototype, {
    __super__: RecordBase.prototype,
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
      var result = db.insert(model.tableName, model._mapToDB(data), true);
      this[model.idField] = result;
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
      var orderBy = model._mapToDB(opts.orderBy);
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