/*global global, require, app, adapter */
var _http = require('http');
var _https = require('https');
adapter.define('http', function(require, exports) {
  "use strict";

  var qs = require('qs');
  var url = require('url');
  var Buffer = require('buffer').Buffer;

  //url helpers
  var parseUrl = url.parse, resolveUrl = url.resolve;

  var BODY_ALLOWED = {POST: 1, PUT: 1};

  var httpReqHeaders = 'Accept Accept-Charset Accept-Encoding Accept-Language Accept-Datetime Authorization ' +
    'Cache-Control Connection Cookie Content-Length Content-MD5 Content-Type Date Expect From Host If-Match ' +
    'If-Modified-Since If-None-Match If-Range If-Unmodified-Since Max-Forwards Pragma Proxy-Authorization ' +
    'Range Referer TE Upgrade User-Agent Via Warning X-Requested-With X-Do-Not-Track X-Forwarded-For ' +
    'X-ATT-DeviceId X-Wap-Profile';

  //index headers by lowercase
  httpReqHeaders = httpReqHeaders.split(' ').reduce(function(headers, header) {
    headers[header.toLowerCase()] = header;
    return headers;
  }, {});

  var request = exports.request_ = function(opts, callback) {
    //todo: organize into ClientRequest and ClientResponse
    if (opts.params) {
      opts.path = opts.path + (~opts.path.indexOf('?') ? '&' : '?') + qs.stringify(opts.params);
    }
    opts.headers = opts.headers || {};
    opts.method = (opts.method) ? opts.method.toUpperCase() : 'GET';
    //normalize header case
    var headers = {};
    for (var n in opts.headers) {
      headers[httpReqHeaders[n.toLowerCase()] || n] = opts.headers[n];
    }
    opts.headers = headers;

    //default content type
    if (opts.method in BODY_ALLOWED && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }
    //opts.data as alias for opts.body
    opts.body = opts.body || opts.data;
    switch (typeof opts.body) {
      case 'string':
        break;
      case 'object':
        opts.body = qs.stringify(opts.body);
        break;
      default:
        opts.body = '';
    }

    var http = (opts.protocol == 'https:') ? _https : _http;

    var req = http.request(opts, function(res) {
      var body = [], length = 0;
      res.on('data', function(data) {
        length += data.length;
        body.push(data.toString('binary'));
      });
      res.on('end', function() {
        res.body = new Buffer(body.join(''), 'binary');
        if (opts.enc) {
          res.body = res.body.toString(opts.enc);
        }
        var data = {statusCode: res.statusCode, headers: res.headers, body: res.body};
        callback(null, data);
      });
    });
    req.on('error', function(err) {
      callback(err);
    });
    if (opts.body) {
      req.write(opts.body);
    }
    req.end();
  };

  exports.get_ = function(opts, callback) {
    if (typeof opts == 'string') {
      opts = {url: opts};
    }
    if (opts.url) {
      Object.assign(opts, parseUrl(opts.url));
    }
    opts.method = 'GET';
    request(opts, callback);
  };

  exports.post_ = function(opts, callback) {
    if (opts.url) {
      Object.assign(opts, url.parse(opts.url));
    }
    opts.method = 'POST';
    opts.headers = opts.headers || {};

    if (!Buffer.isBuffer(opts.body) && typeof opts.body != 'string') {
      opts.body = qs.stringify(opts.body || {});
      opts.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }
    opts.headers['Content-Length'] = opts.body.length;

    request(opts, callback);
  };


});