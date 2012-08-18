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
  var allHeaders = {};
  headers.forEach(function(header) {
    allHeaders[header.toLowerCase()] = header;
  });

  function ClientRequest(opts) {
    Object.extend(this, opts);
    this.headers = this.headers || {};
    Object.extend(this.headers, {
      'Connection': 'close',
      'Accept-Charset': 'utf-8',
      'Accept-Encoding': 'identity'
    });
    this.method = this.method ? this.method.toUpperCase() : 'GET';
  }

  ClientRequest.prototype.addHeader = function(n, val) {
    var key = n.toLowerCase();
    n = allHeaders[key] || n;
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
    //ensure host header is present
    if (!this.headers.hasOwnProperty('Host')) {
      this.addHeader('Host', this.generateHost());
    }

    this.requestCount = (this.requestCount || 0) + 1;

    var xhr = new ActiveXObject('Msxml2.ServerXMLHTTP');

    xhr.open(this.method, this.getFullURL(), false);
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
    this.headers = {};

    var headers = xhr.getAllResponseHeaders();
    headers = headers.split(/\r\n|\r|\n/);
    for (var i = 0, len = headers.length; i < len; i++) {
      parts = headers[i].match(/^ *([^: ]+) *: *(.*)$/);
      if (parts) {
        this.headers[parts[1].toLowerCase()] = parts[2];
      }
    }

    var responseBody = xhr.responseBody;
    this.body = new Buffer((typeof responseBody == 'undefined') ? '' : responseBody);
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