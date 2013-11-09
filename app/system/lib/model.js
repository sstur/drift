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
    this.name = opts.name || opts.tableName;
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

  util.extend(Model.prototype, getQueryHelpers());

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
      return q(this.tableName) + '.' + q(this._mapToDB(field));
    },
    create: function(rec) {
      return new this.Record(rec);
    },
    createFromDB: function(rec) {
      rec = this._mapFromDB(rec);
      this._reviveFields(rec);
      return this.create(rec);
    },
    insert: function(data) {
      var instance = this.create(data);
      instance.insert();
      return instance;
    },
    updateWhere: function(data, params, opts) {
      params = this._mapToDB(params);
      opts = opts || {};
      var built = this._buildUpdateWhere(this, data, params);
      var db = mysql.open();
      return db.exec(built.sql, built.values, opts.returnAffected);
    },
    find: function(params, opts) {
      params = this._mapToDB(params);
      opts = opts || {};
      opts.limit = 1;
      var built = this._buildSelect(params, opts);
      var db = mysql.open();
      var rec = db.query(built.sql, built.values).getOne();
      return rec ? this.createFromDB(rec) : null;
    },
    findAll: function(params, opts, fn) {
      params = params ? this._mapToDB(params) : {};
      var built = this._buildSelect(params, opts);
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
      var built = this._buildCount(this, params);
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
  exports.JoinedSet = JoinedSet;

  util.extend(JoinedSet.prototype, getQueryHelpers());

  util.extend(JoinedSet.prototype, {
    addModel: function(model) {
      var name = model.name;
      this.modelsByName[name] = model;
      this.models.push(model);
    },
    //this is kind of a funky way to allow us to do:
    // `Account.join(User).on('account.user_id', 'user.id')`
    // anything before the . is ignored, so it is the same as
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
      var built = this._buildComplexSelect(params, opts);
      var db = mysql.open();
      var query = db.query(built.sql, built.values, {array: true});
      var results = [], i = 0;
      query.each(function(rec) {
        var items = self._parseResult(rec, built.fields);
        fn ? fn.apply(null, items.concat(i++)) : results.push(items);
      });
      return fn ? null : results;
    },
    //create model instances from query result
    _parseResult: function(rec, fields) {
      var results = {};
      rec.forEach(function(value, i) {
        var field = fields[i];
        var model = field.model;
        var data = results[model.name] || (results[model.name] = {});
        data[field.name] = value;
      });
      return this.models.map(function(model) {
        var data = results[model.name] || {};
        return model.createFromDB(data);
      });
    }
  });

  /**
   * @constructor
   * Represents a single field of a model
   */
  function Field(model, name) {
    this.model = model;
    this.name = name;
  }
  exports.Field = Field;

  util.extend(Field.prototype, {
    toString: function() {
      return this.model.name + '.' + this.name;
    },
    toTableString: function() {
      return this.model._getTableField(this.name);
    }
  });

  /**
   * @constructor
   * Used as a base class for records of individual models
   */
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
      var built = this._buildUpdate(this, model._mapToDB(data));
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
   * Query Class helpers (must be attached to prototype)
   */

  function getQueryHelpers() {
    return {
      _parseField: function(str, defaultModel) {
        defaultModel = defaultModel || this.models ? this.models[0] : this;
        var parts = str.split('.');
        if (parts.length > 1) {
          var modelName = parts.shift();
        }
        var model = modelName && this.modelsByName[modelName] || defaultModel;
        return new Field(model, parts[0]);
      },

      _buildSelect: function(params, opts) {
        opts = opts || {};
        var model = this;
        var fields = model.fields;
        var dbFieldNames = model.dbFieldNames;
        //optionally select only certain fields
        if (opts.fields && opts.fields.length) {
          fields = filterObject(fields, opts.fields);
          dbFieldNames = Object.keys(model._mapToDB(fields));
        }
        var fieldNames = dbFieldNames.map(q).join(', ');
        var sql = 'SELECT ' + fieldNames + ' FROM ' + q(model.tableName);
        //where clause
        var where = this._buildWhere(params);
        if (where.terms.length) {
          sql += ' WHERE ' + where.terms.join(' AND ');
        }
        var values = where.values;
        if (opts.search) {
          var search = model._mapToDB(opts.search.fields);
          var searchTerms = [];
          forEach(search, function(field, text) {
            values.push(normalizeSearchText(text));
            searchTerms.push(q(field) + ' LIKE ?');
          });
          sql += ' AND (' + searchTerms.join(' OR ') + ')';
        }
        //order by
        if (opts.orderBy && (opts.orderBy in fields)) {
          var orderBy = model._mapToDB(opts.orderBy);
          sql += ' ORDER BY ' + q(orderBy) + (opts.dir ? ' ' + opts.dir.toUpperCase() : '');
        }
        //offset/limit
        //todo: move this to adapter
        if (opts.limit || opts.offset) sql += ' LIMIT ' + (opts.limit || '18446744073709551615'); //2^64-1
        if (opts.offset) sql += ' OFFSET ' + opts.offset;
        return {sql: sql, values: values};
      },

      _buildComplexSelect: function(params, opts) {
        opts = opts || {};
        var self = this;
        var models = this.models || [this];
        var selectTerms = [];
        var selectFields = []; //used to construct instances from query result
        if (opts.fields && opts.fields.length) {
          //select only certain fields
          opts.fields.forEach(function(field) {
            field = self._parseField(field);
            selectTerms.push(field.toTableString());
            selectFields.push(field);
          });
        } else {
          //select all fields for each model
          models.forEach(function(model) {
            model.fieldNames.forEach(function(field) {
              field = new Field(model, field);
              selectTerms.push(field.toTableString());
              selectFields.push(field);
            });
          });
        }
        var sql = 'SELECT ' + selectTerms.join(', ') + this._buildFromClause();
        //where clause
        var where = this._buildWhere(params);
        if (where.terms.length) {
          sql += ' WHERE ' + where.terms.join(' AND ');
        }
        var values = where.values;
        //todo: opts.search
        //order by
        if (opts.orderBy) {
          var orderBy = Array.isArray(opts.orderBy) ? opts.orderBy : [opts.orderBy];
          var orderByTerms = orderBy.map(function(field) {
            return self._parseField(field).toTableString() + (opts.dir ? ' ' + opts.dir.toUpperCase() : '');
          });
          sql += ' ORDER BY ' + orderByTerms.join(', ');
        }
        //todo: move this to adapter
        if (opts.limit || opts.offset) sql += ' LIMIT ' + (opts.limit || '18446744073709551615'); //2^64-1
        if (opts.offset) sql += ' OFFSET ' + opts.offset;
        return {fields: selectFields, values: values, sql: sql};
      },

      //todo: why are we passing model here?
      _buildCount: function(model, params) {
        var sql = 'SELECT COUNT(' + q(model.dbIdField) + ') AS ' + q('count') + ' FROM ' + q(model.tableName);
        var where = this._buildWhere(params);
        if (where.terms.length) {
          sql += ' WHERE ' + where.terms.join(' AND ');
        }
        return {sql: sql, values: where.values};
      },

      //todo: consolidate with _buildUpdateWhere
      _buildUpdate: function(instance, data) {
        var terms = [];
        var values = [];
        forEach(data, function(n, val) {
          terms.push(q(n) + ' = ?');
          values.push(val);
        });
        var model = instance._model;
        var sql = 'UPDATE ' + q(model.tableName) + ' SET ' + terms.join(', ') + ' WHERE ' + q(model.dbIdField) + ' = ?';
        values.push(instance[model.idField]);
        return {sql: sql, values: values};
      },

      _buildUpdateWhere: function(model, data, params) {
        var terms = [];
        var values = [];
        forEach(data, function(n, val) {
          terms.push(q(n) + ' = ?');
          values.push(val);
        });
        var sql = 'UPDATE ' + q(model.tableName) + ' SET ' + terms.join(', ');
        var where = this._buildWhere(params);
        if (where.terms.length) {
          sql += ' WHERE ' + where.terms.join(' AND ');
          values.push.apply(values, where.values);
        }
        return {sql: sql, values: values};
      },

      _buildFromClause: function() {
        var rels = this.relationships;
        var models = this.models ? this.models.slice() : [this];
        var thisModel = models.shift();
        var results = [q(thisModel.tableName)];
        models.forEach(function(thatModel, i) {
          var rel = rels[i];
          results.push('INNER JOIN ' + q(thatModel.tableName) + ' ON ' + thisModel._getTableField(rel[0]) + ' = ' + thatModel._getTableField(rel[1]));
          thisModel = thatModel;
        });
        return results.join(' ');
      },

      _buildWhere: function(params) {
        var self = this;
        var terms = [];
        var values = [];
        forEach(params, function(field, term) {
          term = parseTerm(term);
          field = self._parseField(field);
          terms.push(field.toTableString() + ' ' + term.sql);
          values.push.apply(values, term.values);
        });
        return {terms: terms, values: values};
      }

    };
  }


  /*!
   * SQL/Query Helpers
   */

  // Quote identifier using backtick
  function q(identifier) {
    return '`' + identifier + '`';
  }

  // Translate `{$gt: date}` -> `{sql: "> ?", values: [date]}`
  //  supports in-list like: `{$in: [1, 2, 3]}`
  function parseTerm(term) {
    //if term is value (including Date/Buffer) vs a query
    if (!isQuery(term)) term = {$eq: term};
    var key = getFirstKey(term), op = COMPARATORS[key], value = term[key];
    if (Array.isArray(value)) {
      var sql = op + ' (' + repeat('?', value.length).split('').join(', ') + ')';
      var values = value;
    } else {
      sql = op + ' ?';
      values = [value];
    }
    return {sql: sql, values: values};
  }

  // Check if term is an object literal like: {$gt: 1} or {$eq: 'a'}
  function isQuery(term) {
    if (term == null) return false;
    var isPlainObject = (term.toString === Object.prototype.toString);
    return isPlainObject && Object.keys(term).join('').match(/^(\$\w+)+$/);
  }


  /*!
   * Object/Array helpers
   */

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


  /*!
   * Strings/Other
   */

  function repeat(text, len) {
    return new Array(len + 1).join(text);
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

  function error(str) {
    throw new Error('Model Error; ' + str);
  }

});