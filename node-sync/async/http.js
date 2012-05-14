(function() {
  "use strict";

  var url = require('url')
    , http = require('http')
    , Buffer = require('buffer').Buffer;

  var qs = require('../lib/qs');

  var headers = [
    "Accept", "Accept-Charset", "Accept-Encoding", "Accept-Language", "Accept-Datetime", "Authorization",
    "Cache-Control", "Connection", "Cookie", "Content-Length", "Content-MD5", "Content-Type", "Date", "Expect", "From",
    "Host", "If-Match", "If-Modified-Since", "If-None-Match", "If-Range", "If-Unmodified-Since", "Max-Forwards",
    "Pragma", "Proxy-Authorization", "Range", "Referer", "TE", "Upgrade", "User-Agent", "Via", "Warning",
    "X-Requested-With", "X-Do-Not-Track", "X-Forwarded-For", "X-ATT-DeviceId", "X-Wap-Profile"];

  //index headers by lowercase
  var allHeaders = {};
  headers.forEach(function(header) {
    allHeaders[header.toLowerCase()] = header;
  });

  exports.request = function(opts, callback) {
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
        if (res.trailers) data.trailers = res.trailers;
        callback(null, data);
      });
    });
    req.on('error', function(err) {
      callback(err);
    });
    opts.headers = opts.headers || {};
    var headers = {};
    //normalize header case
    for (var n in opts.headers) {
      headers[allHeaders[n.toLowerCase()] || n] = opts.headers[n];
    }
    opts.headers = headers;
    //default content type for post
    if (req.method == 'POST' && !headers['Content-Type']) {
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
    if (opts.body) {
      req.write(opts.body);
    }
    req.end();
    return req;
  };

  exports.get = function(opts, callback) {
    if (typeof opts == 'string') {
      opts = {url: opts};
    }
    if (opts.url) {
      extend(opts, url.parse(opts.url));
    }
    opts.method = 'GET';
    return exports.request(opts, callback);
  };

  exports.post = function(opts, callback) {
    if (opts.url) {
      extend(opts, url.parse(opts.url));
    }
    opts.method = 'POST';
    return exports.request(opts, callback);
  };


  //helpers

  var extend = function(dest, source) {
    for (var n in source) {
      dest[n] = source[n];
    }
  };

})();