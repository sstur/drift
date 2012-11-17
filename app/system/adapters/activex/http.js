/*global app, define */
define('http', function(require, exports) {
  "use strict";

  var qs = require('qs');
  var url = require('url');
  var util = require('util');
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

  function ClientRequest(opts) {
    var self = this;
    util.extend(self, opts);
    self.headers = {};
    var headers = opts.headers || {};
    Object.keys(headers).forEach(function(name) {
      self.addHeader(name, headers[name]);
    });
    self.method = self.method ? self.method.toUpperCase() : 'GET';
    //default content type
    if (opts.method in BODY_ALLOWED && !self.headers['Content-Type']) {
      self.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }
  }

  ClientRequest.prototype.addHeader = function(n, val) {
    var key = n.toLowerCase();
    n = httpReqHeaders[key] || n;
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
    var headers = this.headers;
    //if we don't add a user-agent ActiveX will do it for us
    headers['User-Agent'] = headers['User-Agent'] || 'Mozilla/4.0';
    //ActiveX uses strange syntax to set options
    // add [0] to make IDE/linter happy; compiler directive removes
    // it at compile time
    xhr.option(6)/*@remove{*/[0]/*}@*/ = false;
    Object.keys(headers).forEach(function(n) {
      xhr.setRequestHeader(n, headers[n]);
    });
    try {
      xhr.send(this.body || null);
    } catch(e) {
      throw new Error('Error Requesting: ' + this.path + '; Error: ' + e.message);
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
    if (opts.query) {
      opts.path = opts.path + (~opts.path.indexOf('?') ? '&' : '?') + qs.stringify(opts.query);
    }
    var req = new ClientRequest(opts);
    return req.send();
  };

  exports.get = function(opts) {
    if (typeof opts == 'string') {
      opts = {url: opts};
    }
    if (opts.url) {
      util.extend(opts, parseUrl(opts.url));
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