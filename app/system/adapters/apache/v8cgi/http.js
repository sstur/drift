/*global app, define */

//these use v8cgi require
var Socket = require("socket").Socket;

var _require = function(path) {
  return require(path);
};

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
    extend(this, opts);
    this.headers = this.headers || {};
    extend(this.headers, {
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
    var redirectCodes = [301, 302, 303, 307];
    var res = new ClientResponse(raw);

    var maxRedirects = this.maxRedirects || 0;
    if (!maxRedirects || this.requestCount > maxRedirects + 1) {
      return res;
    }

    var code = res.status;
    if (redirectCodes.indexOf(code) < 0) {
      return res;
    }

    var loc = res.getHeader('Location');
    if (!loc) {
      return res;
    }

    if (code == 302 || code == 303) {
      /*
        302 should not be used for switching to GET, but...
        see http://en.wikipedia.org/wiki/HTTP_302 ;)
      */
      this.method = 'GET';
    }
    var oldUrl = this.protocol + '//' + this.host + this.path;
    var newUrl, i;
    if (~loc.indexOf('://')) {
      /* absolute URI, standards compliant */
      newUrl = loc;
    } else {
      if (loc.charAt(0) == '/') {
        i = oldUrl.indexOf('/', 8);
      } else {
        i = oldUrl.lastIndexOf('/') + 1;
      }
      newUrl = oldUrl.substring(0, i) + loc;
    }
    extend(this, parseUrl(newUrl));
    return this.send();
  };


  function ClientResponse(raw) {
    this.data = null;
    this.status = 0;
    this.statusReason = '';
    this.headers = {};

    var index = raw.indexOf('\r\n\r\n');

    if (index == -1) {
      throw new Error('No header-body separator found');
    }
    var head = raw.slice(0, index);
    var body = raw.slice(index + 4);
    var arr = head.split('\r\n');

    var parts = arr.shift().match(/^ *http\/[^ ]+ *([0-9]+) *(.*)$/i);
    this.status = parseInt(parts[1], 10);
    this.statusReason = parts[2] || "";

    for (var i = 0, len = arr.length; i < len; i++) {
      parts = arr[i].match(/^ *([^: ]+) *: *(.*)$/);
      if (parts) {
        this.headers[parts[1].toLowerCase()] = parts[2];
      }
    }

    if (this.getHeader('Transfer-Encoding') == 'chunked') {
      this.data = this._parseChunked(body);
    } else {
      this.data = body;
    }
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
      hex = "";

      /* fetch hex number at the beginning of each chunk. this is terminated by \r\n */
      while (index < body.length) {
        num = body.charCodeAt(index);
        if (num == 13) {
          break;
        }
        hex += String.fromCharCode(num);
        index++;
      }

      /* skip CRLF */
      index += 2;

      var chunkLength = parseInt(hex, 16);
      if (!chunkLength) {
        break;
      }

      /* read the chunk */
      result.push(body.slice(index, index + chunkLength));
      index += chunkLength;

      /* skip CRLF after chunk */
      index += 2;
    }

    return result.join('');
  };



  function extend(dest, source) {
    for (var n in source) {
      dest[n] = source[n];
    }
  }

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
    var res = req.send(false);
    var data = {statusCode: res.status, headers: res.headers};
    data.body = new Buffer(res.data, 'binary');
    return data;
  };

  exports.get = function(opts) {
    if (typeof opts == 'string') {
      opts = {url: opts};
    }
    if (opts.url) {
      var parsed = parseUrl(opts.url);
      extend(opts, parsed);
    }
    opts.method = 'GET';
    return exports.request(opts);
  };

  exports.post = function(opts) {
    if (opts.url) {
      extend(opts, parseUrl(opts.url));
    }
    opts.method = 'POST';

    if (!Buffer.isBuffer(opts.body) || typeof opts.body != 'string') {
      opts.body = qs.stringify(opts.body || {});
      this.addHeader('Content-Type', 'application/x-www-form-urlencoded');
    }
    this.addHeader('Content-Length', opts.body.length);

    return exports.request(opts);
  };

});