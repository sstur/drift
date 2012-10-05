/*global app, define */
define('http', function(require, exports) {
  "use strict";

  var qs = require('qs');
  var url = require('url');
  var util = require('util');
  var Buffer = require('buffer').Buffer;

  //url helpers
  var parseUrl = url.parse, resolveUrl = url.resolve;

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
    util.extend(this, opts);
    this.headers = this.headers || {};
    this.method = this.method ? this.method.toUpperCase() : 'GET';
  }

  ClientRequest.prototype.addHeader = function(n, val) {
    var key = n.toLowerCase();
    n = headers[key] || n;
    this.headers[n] = val;
  };

  ClientRequest.prototype.getFullUrl = function() {
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

    var xhr = new ActiveXObject('WinHttp.WinHttpRequest.5.1');

    xhr.open(this.method, this.getFullUrl(), false);
    //if we don't add a user-agent ActiveX will do it for us
    this.headers['User-Agent'] = this.headers['User-Agent'] || 'Mozilla/4.0';
    //ActiveX uses strange syntax to set options
    // add [0] to make IDE/linter happy; compiler directive removes
    // it at compile time
    xhr.option(6)/*@remove{*/[0]/*}@*/ = false;
    for (var n in this.headers) {
      xhr.setRequestHeader(n, this.headers[n]);
    }
    try {
      xhr.send(this.body || null);
    } catch(e) {
      throw new Error('Error Requesting: ' + this.path + '; Error: ' + e.description);
    }

    return this._handleResponse(xhr);
  };

  ClientRequest.prototype._handleResponse = function(xhr) {
    var redirectCodes = {'301': 1, '302': 1, '303': 1, '307': 1};
    var res = new ClientResponse(xhr);
    var maxRedirects = this.maxRedirects || 0;
    if (!maxRedirects || this.requestCount >= maxRedirects) {
      return res;
    }
    var code = res.statusCode;
    if (!(code in redirectCodes)) {
      return res;
    }
    var loc = res.headers['location'];
    if (!loc) {
      return res;
    }
    if (code == 302 || code == 303) {
      //302 should not be used for switching to GET, but... http://en.wikipedia.org/wiki/HTTP_302
      this.method = 'GET';
    }
    var newUrl = resolveUrl(this.getFullUrl(), loc);
    util.extend(this, parseUrl(newUrl));
    return this.send();
  };


  function ClientResponse(xhr) {
    this.statusCode = +xhr.status;
    this.statusReason = '' + xhr.statusText;
    this.status = this.statusCode + ' ' + this.statusReason;
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

  exports.ClientRequest = ClientRequest;
  exports.ClientResponse = ClientResponse;

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
      util.extend(opts, parsed);
    }
    opts.method = 'GET';
    return exports.request(opts);
  };

  exports.post = function(opts) {
    if (opts.url) {
      util.extend(opts, parseUrl(opts.url));
    }
    opts.method = 'POST';
    opts.headers = opts.headers || {};

    if (!Buffer.isBuffer(opts.body) && typeof opts.body != 'string') {
      opts.body = qs.stringify(opts.body || {});
      opts.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }
    opts.headers['Content-Length'] = opts.body.length;

    return exports.request(opts);
  };

});