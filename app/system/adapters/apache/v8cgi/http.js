/*global app, define, _require */
define('http', function(require, exports) {
  "use strict";

  //using v8cgi require
  var Socket = _require("socket").Socket;

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
    var self = this;
    util.extend(self, opts);
    //default headers
    self.headers = {
      'Connection': 'close',
      'Accept-Charset': 'utf-8',
      'Accept-Encoding': 'identity'
    };
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
    var hiddenSocket = null;

    //ensure host header is present
    if (!this.headers.hasOwnProperty('Host')) {
      this.addHeader('Host', this.generateHost());
    }

    this.requestCount = (this.requestCount || 0) + 1;

    //build request head
    var head = this.method + ' ' + this.path + ' HTTP/1.1\r\n';
    for (var n in this.headers) {
      head += n + ': ' + this.headers[n] + '\r\n';
    }
    head += '\r\n';

    var ipaddr = Socket.getAddrInfo(this.hostname, Socket.PF_INET);
    var socket = new Socket(Socket.PF_INET, Socket.SOCK_STREAM, Socket.IPPROTO_TCP);
    socket.connect(ipaddr, this.port);

    if (this.protocol == 'https:') {
      /* wrap in a TLS connection */
      var TLS = _require('tls').TLS;
      hiddenSocket = socket;
      socket = new TLS(socket);
      socket.connect();
    }

    /* send request */
    socket.send(head);
    if (this.body) {
      socket.send(this.body);
    }

    var chunk, received = [];
    do {
      chunk = socket.receive(1024).toRaw();
      received.push(chunk);
    } while (chunk.length > 0);

    if (hiddenSocket) {
      //unwrap and close TLS connection
      socket.close();
      socket = socket.getSocket();
    }

    socket.close();

    return this._handleResponse(received.join(''));
  };

  ClientRequest.prototype._handleResponse = function(raw) {
    var redirectCodes = {'301': 1, '302': 1, '303': 1, '307': 1};
    var res = new ClientResponse(raw);
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


  function ClientResponse(raw) {
    var index = raw.indexOf('\r\n\r\n');
    if (index < 0) {
      throw new Error('No header-body separator found');
    }
    var head = raw.slice(0, index);
    var arr = head.split('\r\n');
    this.status = arr.shift().trim().replace(/^http\/[^ ]+ *$/i, '');
    var parts = this.status.match(/^([0-9]+) *(.*)$/i);
    this.statusCode = parseInt(parts[1], 10);
    this.statusReason = parts[2] || '';
    this.headers = parseHeaders(head.join('\r\n'));
    var body = raw.slice(index + 4);
    if (this.headers['transfer-encoding'] == 'chunked') {
      body = this._parseChunked(body);
    }
    this.body = new Buffer(body, 'binary');
  }

  ClientResponse.prototype.getHeader = function(name) {
    return this.headers[name.toLowerCase()];
  };

  ClientResponse.prototype.getHeaders = function() {
    return this.headers;
  };

  ClientResponse.prototype._parseChunked = function(body) {
    var index = 0;
    var num, hex;
    var result = [];
    while (index < body.length) {
      hex = '';
      //fetch hex number at the beginning of each chunk. this is terminated by \r\n
      while (index < body.length) {
        num = body.charCodeAt(index);
        if (num == 13) {
          break;
        }
        hex += String.fromCharCode(num);
        index++;
      }
      //skip CRLF
      index += 2;
      var chunkLength = parseInt(hex, 16);
      if (!chunkLength) {
        break;
      }
      //read the chunk
      result.push(body.slice(index, index + chunkLength));
      index += chunkLength;
      //skip CRLF after chunk
      index += 2;
    }

    return result.join('');
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