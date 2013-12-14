/*global app, define */
define('model', function(require, exports) {
  "use strict";
  var util = require('util');
  var database = require(app.cfg('models/database'));

  var _hasOwnProperty = Object.prototype.hasOwnProperty;

  var COMPARATORS = {
    $lt: '<',
    $gt: '>',
    $lte: '<=',
    $gte: '>=',
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
    //opts term not clear here
    var fieldMap = opts.fieldMap || opts.dbToFields || opts.dbFieldsToModel;
    if (fieldMap) {
      this.dbToFields = fieldMap;
      this.fieldsToDb = invert(fieldMap);
    }
    this.dbIdField = this._mapToDB(this.idField);
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
    _mapToDB: function(field) {
      var map = this.fieldsToDb;
      return map && map[field] || field;
    },
    _getTableField: function(field) {
      return q(this.tableName) + '.' + q(this._mapToDB(field));
    },
    create: function(rec) {
      return new this.Record(rec);
    },
    createFromDB: function(rec) {
      var data = this.dbToFields ? mapKeys(rec, this.dbToFields) : rec;
      reviveFields(data, this.jsonFields);
      return this.create(data);
    },
    insert: function(data) {
      var instance = this.create(data);
      instance.insert();
      return instance;
    },
    updateWhere: function(data, params, opts) {
      opts = opts || {};
      var built = new QueryBuilder(this).buildUpdate(data, params);
      var db = database.open();
      return db.exec(built.sql, built.values, opts.returnAffected);
    },
    destroyWhere: function(params, opts) {
      opts = opts || {};
      var built = new QueryBuilder(this).buildDelete(params);
      var db = database.open();
      return db.exec(built.sql, built.values, opts.returnAffected);
    },
    find: function(params, opts) {
      opts = opts || {};
      opts.limit = 1;
      var built = new QueryBuilder(this).buildSelect(params, opts);
      var db = database.open();
      var rec = db.query(built.sql, built.values, {array: true}).getOne();
      return rec ? parseResult(rec, this, built.fields) : null;
    },
    // all arguments are optional, but if opts specified, params must be also
    findAll: function(params, opts, fn) {
      var args = toArray(arguments);
      fn = (typeof args[args.length - 1] === 'function') ? args.pop() : null;
      params = args[0] || {};
      opts = args[1] || {};
      var built = new QueryBuilder(this).buildSelect(params, opts);
      var db = database.open();
      var query = db.query(built.sql, built.values, {array: true});
      var results = [], self = this, i = 0;
      query.each(function(rec) {
        var instance = parseResult(rec, self, built.fields);
        fn ? fn.call(null, instance, i++) : results.push(instance);
      });
      return fn ? null : results;
    },
    count: function(params) {
      var built = new QueryBuilder(this).buildCount(params);
      var db = database.open();
      var rec = db.query(built.sql, built.values, {array: true}).getOne();
      return rec[0];
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

  util.extend(JoinedSet.prototype, {
    addModel: function(model) {
      this.models.push(model);
    },
    //In order to allow `Account.join(User).on('Account.user_id', 'User.id')`
    // the part before the . is ignored, so it is the same as
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
    // all arguments are optional, but if opts specified, params must be also
    findAll: function(params, opts, fn) {
      var args = toArray(arguments);
      fn = (typeof args[args.length - 1] === 'function') ? args.pop() : null;
      params = args[0] || {};
      opts = args[1] || {};
      var self = this;
      var built = new QueryBuilder(this.models, this.relationships).buildSelect(params, opts);
      var db = database.open();
      var query = db.query(built.sql, built.values, {array: true});
      var results = [], i = 0;
      query.each(function(rec) {
        var items = parseResult(rec, self.models, built.fields);
        fn ? fn.apply(null, items.concat(i++)) : results.push(items);
      });
      return fn ? null : results;
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
   * Used as a base class for each model's Record class
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
      if (model.fields.updated_at && model.fields.updated_at.type == 'date') {
        data.updated_at = new Date();
      }
      var params = {};
      params[model.idField] = this[model.idField];
      var built = new QueryBuilder(model).buildUpdate(data, params);
      var db = database.open();
      db.exec(built.sql, built.values);
    },
    destroy: function() {
      var model = this._model;
      var params = {};
      params[model.idField] = this[model.idField];
      var built = new QueryBuilder(model).buildDelete(params);
      var db = database.open();
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
      //set created_ad and updated_at if present
      var date = new Date();
      if (model.fields.created_at && model.fields.created_at.type == 'date') {
        if (data.created_at == null) data.created_at = date;
      }
      if (model.fields.updated_at && model.fields.updated_at.type == 'date') {
        if (data.updated_at == null) data.updated_at = data.created_at || date;
      }
      var built = new QueryBuilder(model).buildInsert(data);
      var db = database.open();
      var result = db.exec(built.sql, built.values, true);
      this[model.idField] = result;
    },
    toJSON: function() {
      var result = {}, self = this;
      forEach(this._model.fields, function(name, def) {
        def = def || {};
        result[name] = (def.type == 'json') ? util.clone(self[name]) : self[name];
      });
      return result;
    }
  });


  /**
   * @constructor
   * Query Building helper
   */
  function QueryBuilder(models, relationships) {
    if (!(this instanceof QueryBuilder)) return new QueryBuilder(models);
    this.models = Array.isArray(models) ? models : [models];
    var modelsByName = this.modelsByName = {};
    this.models.forEach(function(model) {
      modelsByName[model.name] = model;
    });
    this.relationships = relationships;
  }
  exports.QueryBuilder = QueryBuilder;

  util.extend(QueryBuilder.prototype, {
    buildSelect: function(params, opts) {
      opts = opts || {};
      var self = this;
      var models = this.models;
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
      var sql = 'SELECT ' + selectTerms.join(', ') + this.buildFrom();
      //where clause
      var where = this.buildWhere(params);
      if (where.terms.length) {
        sql += ' WHERE ' + where.terms.join(' AND ');
      }
      var values = where.values;
      //search fields
      if (opts.search) {
        var searchTerms = [];
        forEach(opts.search.fields, function(field, text) {
          field = self._parseField(field);
          searchTerms.push(field.toTableString() + ' LIKE ?');
          values.push(normalizeSearchText(text));
        });
        var searchOp = opts.search.operator || '';
        searchOp = (searchOp.toLowerCase() == 'and') ? ' AND ' : ' OR ';
        if (where.terms.length) {
          sql += ' AND (' + searchTerms.join(searchOp) + ')';
        } else {
          sql += ' WHERE ' + searchTerms.join(searchOp);
        }
      }
      //order by
      if (opts.orderBy) {
        var orderBy = Array.isArray(opts.orderBy) ? opts.orderBy : [opts.orderBy];
        var orderByTerms = orderBy.map(function(term) {
          if (typeof term == 'string') term = {field: term};
          var dir = term.dir || opts.dir;
          return self._parseField(term.field).toTableString() + (dir ? ' ' + dir.toUpperCase() : '');
        });
        sql += ' ORDER BY ' + orderByTerms.join(', ');
      }
      //todo: move this to adapter
      if (opts.limit || opts.offset) sql += ' LIMIT ' + (opts.limit || '18446744073709551615'); //2^64-1
      if (opts.offset) sql += ' OFFSET ' + opts.offset;
      return {fields: selectFields, values: values, sql: sql};
    },

    buildCount: function(params) {
      var model = this.models[0];
      var sql = 'SELECT COUNT(' + q(model.dbIdField) + ') FROM ' + q(model.tableName);
      var where = this.buildWhere(params);
      if (where.terms.length) {
        sql += ' WHERE ' + where.terms.join(' AND ');
      }
      return {sql: sql, values: where.values};
    },

    buildUpdate: function(data, params) {
      var model = this.models[0];
      var terms = [];
      var values = [];
      forEach(data, function(field, value) {
        terms.push(q(model._mapToDB(field)) + ' = ?');
        values.push(value);
      });
      var sql = 'UPDATE ' + q(model.tableName) + ' SET ' + terms.join(', ');
      var where = this.buildWhere(params);
      if (where.terms.length) {
        sql += ' WHERE ' + where.terms.join(' AND ');
        values.push.apply(values, where.values);
      }
      return {sql: sql, values: values};
    },

    buildDelete: function(params) {
      var model = this.models[0];
      var sql = 'DELETE FROM ' + q(model.tableName);
      var where = this.buildWhere(params);
      if (where.terms.length) {
        sql += ' WHERE ' + where.terms.join(' AND ');
        var values = where.values;
      }
      return {sql: sql, values: values || []};
    },

    buildInsert: function(data) {
      var model = this.models[0];
      var fields = [];
      var values = [];
      forEach(data, function(field, value) {
        fields.push(q(model._mapToDB(field)));
        values.push(value);
      });
      var sql = 'INSERT INTO ' + q(model.tableName) + ' (' + fields.join(', ') + ') VALUES (' + repeat('?', values.length).split('').join(', ') + ')';
      return {sql: sql, values: values};
    },

    buildFrom: function() {
      var rels = this.relationships;
      var models = this.models.slice();
      var thisModel = models.shift();
      var results = [q(thisModel.tableName)];
      models.forEach(function(thatModel, i) {
        var rel = rels[i];
        results.push('INNER JOIN ' + q(thatModel.tableName) + ' ON ' + thisModel._getTableField(rel[0]) + ' = ' + thatModel._getTableField(rel[1]));
        thisModel = thatModel;
      });
      return ' FROM ' + results.join(' ');
    },

    buildWhere: function(params) {
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
    },

    _parseField: function(str, defaultModel) {
      defaultModel = defaultModel || this.models[0];
      var parts = str.split('.');
      if (parts.length > 1) {
        var modelName = parts.shift();
      }
      var model = modelName && this.modelsByName[modelName] || defaultModel;
      return new Field(model, parts[0]);
    }

  });


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

  // Create model instances from query result
  function parseResult(rec, models, fields) {
    models = Array.isArray(models) ? models : [models];
    var results = {};
    rec.forEach(function(value, i) {
      var field = fields[i];
      var model = field.model;
      var data = results[model.name] || (results[model.name] = {});
      data[field.name] = value;
    });
    var instances = models.map(function(model) {
      var data = results[model.name] || {};
      return model.createFromDB(data);
    });
    return (instances.length == 1) ? instances[0] : instances;
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

  function reviveFields(data, keys) {
    keys.forEach(function(key) {
      if (typeof data[key] == 'string') {
        try {
          var value = util.parse(data[key] || '{}'); //catch empty string
        } catch(e) {}
      }
      data[key] = value || {}; //catch null
    });
  }

  function error(str) {
    throw new Error('Model Error; ' + str);
  }

});