/*global app, define */
//todo: multiple headers with the same name? (use util.parseHeaders)
define('http', function(require, exports) {
  "use strict";

  var qs = require('qs');
  var Buffer = require('buffer').Buffer;

  var headers = [
    "Accept", "Accept-Charset", "Accept-Encoding", "Accept-Language", "Accept-Datetime", "Authorization",
    "Cache-Control", "Connection", "Cookie", "Content-Length", "Content-MD5", "Content-Type", "Date", "Expect", "From",
    "Host", "If-Match", "If-Modified-Since", "If-None-Match", "If-Range", "If-Unmodified-Since", "Max-Forwards",
    "Pragma", "Proxy-Authorization", "Range", "Referer", "TE", "Upgrade", "User-Agent", "Via", "Warning",
    "X-Requested-With", "X-Do-Not-Track", "X-Forwarded-For", "X-ATT-DeviceId", "X-Wap-Profile"];

  //index headers by lowercase
  headers = headers.reduce(function(headers, header) {
    headers[header.toLowerCase()] = header;
    return headers;
  }, {});

  function ClientRequest(opts) {
    Object.extend(this, opts);
    this.headers = this.headers || {};
//    Object.extend(this.headers, {
//      'Connection': 'close',
//      'Accept-Charset': 'utf-8',
//      'Accept-Encoding': 'identity'
//    });
    this.method = this.method ? this.method.toUpperCase() : 'GET';
  }

  ClientRequest.prototype.addHeader = function(n, val) {
    var key = n.toLowerCase();
    n = headers[key] || n;
    this.headers[n] = val;
  };

  ClientRequest.prototype.getFullURL = function() {
    return this.protocol + '//' + this.generateHost() + this.path;
  };

  ClientRequest.prototype.generateHost = function() {
    var proto = this.protocol, port = this.port;
    if ((proto == 'http:' && port == 80) || (proto == 'https:' && port == 443)) {
      return this.hostname;
    } else {
      return this.hostname + ':' + port;
    }
  };

  ClientRequest.prototype.send = function() {
    this.requestCount = (this.requestCount || 0) + 1;

    var xhr = new ActiveXObject('Msxml2.ServerXMLHTTP');

    xhr.open(this.method, this.getFullURL(), false);
    throw new Error(typeof xhr.removeHeader);
    for (var n in this.headers) {
      xhr.setRequestHeader(n, this.headers[n]);
    }
    try {
      if (this.body) {
        xhr.send(this.body);
      } else {
        xhr.send();
      }
    } catch(e) {
      throw new Error('Error Requesting: ' + this.path + '; Error: ' + e.description);
    }

    return new ClientResponse(xhr);

  };


  function ClientResponse(xhr) {
    this.status = '' + xhr.status;
    var parts = this.status.match(/^([0-9]+) *(.*)$/i);
    this.statusCode = parseInt(parts[1], 10);
    this.statusReason = parts[2] || '';
    this.headers = parseHeaders(xhr.getAllResponseHeaders());
    var responseBody = xhr.responseBody;
    this.body = new Buffer((responseBody == null) ? '' : responseBody);
  }

  ClientResponse.prototype.getHeader = function(name) {
    return this.headers[name.toLowerCase()];
  };

  ClientResponse.prototype.getHeaders = function() {
    return this.headers;
  };


  /*!
   * Helper Functions
   *
   */

  function parseUrl(url) {
    var parts = url.match(/^ *((https?):\/\/)?([^:\/]+)(:([0-9]+))?([^\?]*)(\?.*)?$/);
    var parsed = {
      protocol: parts[2] ? parts[2].toLowerCase() + ':' : 'http:',
      hostname: parts[3] ? parts[3].toLowerCase() : '',
      port: parts[5],
      pathname: parts[6] || '/',
      search: parts[7] || ''
    };
    parsed.port = parsed.port || (parts[2] == 'https' ? 443 : 80);
    parsed.host = parsed.hostname + ':' + parsed.port;
    parsed.path = parsed.pathname + parsed.search;
    return parsed;
  }

  function parseHeaders(raw) {
    var headers = {}, all = raw.split('\r\n');
    for (var i = 0; i < all.length; i++) {
      var header = all[i], pos = header.indexOf(':');
      if (pos < 0) continue;
      var n = header.slice(0, pos), val = header.slice(pos + 1).trim(), key = n.toLowerCase();
      headers[key] = headers[key] ? headers[key] + ', ' + val : val;
    }
    return headers;
  }


  /*!
   * Exports
   *
   */

  exports.request = function(opts) {
    if (opts.params) {
      opts.path = opts.path + (~opts.path.indexOf('?') ? '&' : '?') + qs.stringify(opts.params);
    }
    var req = new ClientRequest(opts);
    return req.send();
  };

  exports.get = function(opts) {
    if (typeof opts == 'string') {
      opts = {url: opts};
    }
    if (opts.url) {
      var parsed = parseUrl(opts.url);
      Object.extend(opts, parsed);
    }
    opts.method = 'GET';
    return exports.request(opts);
  };

  exports.post = function(opts) {
    if (opts.url) {
      Object.extend(opts, parseUrl(opts.url));
    }
    opts.method = 'POST';

    if (!Buffer.isBuffer(opts.body) && typeof opts.body != 'string') {
      opts.body = qs.stringify(opts.body || {});
      this.addHeader('Content-Type', 'application/x-www-form-urlencoded');
    }
    this.addHeader('Content-Length', opts.body.length);

    return exports.request(opts);
  };

});