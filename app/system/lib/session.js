/*global app, define */
define('session', function(require, exports, module) {
  "use strict";

  var util = require('util');

  var RE_TOKEN = /^[0-9a-f]{32}$/i;

  var cache = {};
  var datastore = (app.cfg('session/default_datastore') == 'database') ? 'database' : 'memory';

  function getCookieName(type) {
    return (type == 'longterm') ? 'LTSID' : 'STSID';
  }

  function generateSessionToken() {
    var token = '';
    for (var i = 0; i < 32; i++) {
      token += Math.floor(Math.random() * 16).toString(16);
    }
    return token;
  }

  function getSessionObject(inst) {
    var type = inst.type, req = inst.req, res = inst.res;
    if (cache[type]) {
      return cache[type];
    }
    var key = getCookieName(type);
    var token = req.cookies(key);
    token = RE_TOKEN.test(token) ? token : null;
    if (!token || type == 'longterm') {
      token = token || generateSessionToken();
      if (type == 'longterm') {
        res.cookies(key, {value: token, expires: Date.today().add({months: 12})});
      } else {
        res.cookies(key, token);
      }
    }
    var session = cache[type] = {token: token};
    req.on('end', function() {
      controllers[datastore].saveAll(session);
    });
    return session;
  }

  var controllers = {
    memory: {
      'load': function(session, inst) {
        var token = session.token;
        var data = app.data('session:' + token + ':' + inst.namespace);
        session.lastAccess = app.data('session:last-access:' + token);
        if (session.lastAccess) {
          app.data('session:last-access:' + token, Date.now());
        }
        if (session.lastAccess && (!inst.oldest || inst.oldest < session.lastAccess)) {
          data = data || {};
        } else {
          data = {};
        }
        this._old = JSON.stringify(data);
        if (!session.namespaces) session.namespaces = {};
        return session.namespaces[inst.namespace] = data;
      },
      'saveAll': function(session) {
        var self = controllers.memory;
        forEach(session.namespaces, function(namespace, data) {
          self.save(session, namespace, data);
        });
      },
      'save': function(session, namespace, data) {
        var stringified = (data == null) ? '' : JSON.stringify(data);
        //is dirty?
        if (stringified !== (session._old || '')) {
          app.data('session:' + session.token + ':' + namespace, data);
          session._old = stringified;
        }
        if (!session.lastAccess) {
          session.lastAccess = Date.now();
          app.data('session:last-access:' + session.token, session.lastAccess);
        }
      }
    },
    database: {
      'load': function(session, inst) {
        var self = controllers.database;
        var db = self.db || (self.db = require('localdb').open(app.cfg('session/database') || 'session', dbInit));
        var token = session.token, data;
        if (!session.lastAccess) {
          var meta = db.query("SELECT * FROM [session] WHERE [guid] = CAST_GUID($1)", [token]).getOne();
          if (meta) {
            session.lastAccess = meta.last_accessed;
          }
        }
        if (session.lastAccess && (!inst.oldest || inst.oldest < session.lastAccess)) {
          var rec = db.query("SELECT * FROM [session_data] WHERE [guid] = CAST_GUID($1) AND [namespace] = $2", [token, inst.namespace]).getOne();
          if (rec) {
            data = JSON.parse(rec.data);
          }
        }
        if (!data) {
          data = {};
        }
        this._old = JSON.stringify(data);
        if (!session.namespaces) session.namespaces = {};
        return session.namespaces[inst.namespace] = data;
      },
      'saveAll': function(session) {
        var self = controllers.database;
        forEach(session.namespaces, function(namespace, data) {
          self.save(session, namespace, data);
        });
      },
      'save': function(session, namespace, data) {
        var self = controllers.database, req = session.req;
        var db = self.db || (self.db = require('localdb').open(app.cfg('session/database') || 'session', dbInit));
        var stringified = (data == null) ? '' : JSON.stringify(data);
        //is dirty?
        if (stringified !== (session._old || '')) {
          var sql = "UPDATE [session_data] SET [data] = $3 WHERE [guid] = CAST_GUID($1) AND [namespace] = $2";
          var num = db.exec(sql, [session.token, namespace, stringified], true);
          if (!num) {
            sql = "INSERT INTO [session_data] ([guid], [namespace], [data]) VALUES (CAST_GUID($1), $2, $3)";
            db.exec(sql, [session.token, namespace, stringified]);
          }
          session._old = stringified;
        }
        //Update Last-Accessed (whether we saved any data or not)
        if (!session.lastAccessUpdated) {
          var sql = "UPDATE [session] SET [last_accessed] = NOW() WHERE [guid] = CAST_GUID($1)";
          var num = db.exec(sql, [session.token], true);
          if (!num) {
            sql = "INSERT INTO [session] ([guid], [ip_addr], [http_ua], [created], [last_accessed]) VALUES (CAST_GUID($1), $2, $3, NOW(), NOW())";
            db.exec(sql, [session.token, req.data('ipaddr'), req.headers('user-agent')]);
          }
          session.lastAccess = Date.now();
          session.lastAccessUpdated = true;
        }
      }
    }
  };

  function dbInit(conn) {
    conn.exec("CREATE TABLE [session] ([guid] GUID CONSTRAINT [pk_guid] PRIMARY KEY, [ip_addr] TEXT(15), [http_ua] MEMO, [created] DATETIME, [last_accessed] DATETIME)");
    conn.exec("CREATE TABLE [session_data] ([id] INTEGER IDENTITY(1234,1) CONSTRAINT [pk_id] PRIMARY KEY, [guid] GUID, [namespace] TEXT(255), [data] MEMO)");
  }

  function Session(req, res, opts) {
    this.req = req;
    this.res = res;
    this.opts = opts;
    this.init();
  }

  util.extend(Session.prototype, {
    init: function() {
      this.type = (this.opts.longterm) ? 'longterm' : 'shortterm';
      this.namespace = this.opts.namespace || '';
      var m, units = {d: 'days', h: 'hours', m: 'minutes'};
      if (this.opts.expires && (m = this.opts.expires.match(/^(\d+)([dhm])$/))) {
        var u = units[m[2]], param = {};
        param[u] = 0 - Number.parseInt(m[1]);
        this.oldest = Date.now().add(param);
      }
    },
    load: function() {
      var session = getSessionObject(this);
      return controllers[datastore].load(session, this);
    },
    getData: function() {
      var session = getSessionObject(this);
      return session.namespaces && session.namespaces[this.namespace] || this.load();
    },
    reload: function() {
      var session = getSessionObject(this);
      if (session.namespaces) {
        session.namespaces[this.namespace] = null;
      }
    },
    access: function(n, val) {
      var data = this.getData();
      if (arguments.length == 2) {
        (val == null) ? delete data[n] : data[n] = val;
        return val;
      } else {
        val = data[n];
        return (val == null) ? '' : val;
      }
    },
    clear: function() {
      var data = this.getData(), keys = Object.keys(data);
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        delete data[key];
      }
      return data;
    },
    flush: function() {
      var session = getSessionObject(this);
      if (session.namespaces && session.namespaces[this.namespace]) {
        controllers[datastore].save(session, this.namespace, session.namespaces[this.namespace]);
      }
    }
  });

  module.exports = {
    init: function(req, res, opts) {
      var options = {};
      if (vartype(opts, 'string')) {
        opts = opts.w();
      }
      if (vartype(opts, 'array')) {
        opts.each(function(i, opt) {
          var m = opt.match(/^([\w-]+)(?:[:=]([^\s]+))?$/);
          if (m && m[2]) {
            options[m[1]] = m[2];
          } else {
            options[opt] = 'true';
          }
        });
      } else
      if (vartype(opts, 'object')) {
        Object.append(options, opts);
      }
      var session = new Session(req, res, options);
      var accessor = function() {
        return session.access.apply(session, arguments);
      };
      accessor.reload = session.reload.bind(session);
      accessor.clear = session.clear.bind(session);
      accessor.flush = session.flush.bind(session);
      accessor.getToken = function() {
        return getSessionObject(session).token;
      };
      return accessor;
    }
  };

});