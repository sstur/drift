/*global app, define */

var _require = function(path) {
  return require(path);
};

//these use v8cgi require
var Socket = require("socket").Socket;
var Buffer = require("binary").Buffer;

define('http', function(require, exports) {
  "use strict";

  var qs = require('qs');

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


  //todo: add optional param for maxRedirects
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

  ClientRequest.prototype.send = function(follow) {
    var hiddenSocket = null;

    //ensure host header is present
    if (!this.headers.hasOwnProperty('Host')) {
      this.addHeader('Host', this.generateHost());
    }

    //build request
    var data = this.method + ' ' + this.path + ' HTTP/1.1\r\n';
    for (var n in this.headers) {
      data += n + ': ' + this.headers[n] + '\r\n';
    }
    data += '\r\n';
    //todo: body might be buffer
    if (this.body) {
      data += this.body;
    }

    var protocol = Socket.PF_INET;
    var ip = null;
    try {
      ip = Socket.getAddrInfo(this.hostname, Socket.PF_INET6).split('%', 1)[0];
      protocol = Socket.PF_INET6;
    } catch(e) {
      ip = Socket.getAddrInfo(this.hostname, Socket.PF_INET);
    }
    var socket = new Socket(protocol, Socket.SOCK_STREAM, Socket.IPPROTO_TCP);
    socket.connect(ip, this.port);

    if (this.protocol == 'https:') {
      /* wrap in a TLS connection */
      var TLS = _require('tls').TLS;
      hiddenSocket = socket;
      socket = new TLS(socket);
      socket.connect();
    }

    /* send request */
    socket.send(data);

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

    return this._handleResponse(received.join(''), follow);
  };

  ClientRequest.prototype._handleResponse = function(raw, follow) {
    var codes = [301, 302, 303, 307];
    var r = new ClientResponse(raw);
    if (!follow) {
      return r;
    }

    var code = r.status;
    if (codes.indexOf(code) == -1) {
      return r;
    }

    var loc = r.getHeader('Location');
    if (!loc) {
      return r;
    }

    if (code == 302 || code == 303) {
      /*
        302 should not be used for switching to GET, but...
        see http://en.wikipedia.org/wiki/HTTP_302 ;)
      */
      this.method = 'GET';
    }
    var url, i;
    if (~loc.indexOf('://')) {
      /* absolute URI, standards compliant */
      url = loc;
    } else {
      //todo: use parsed
      /* relative URI */
      if (loc.charAt(0) == '/') {
        i = url.indexOf('/', 8);
      } else {
        i = url.lastIndexOf('/') + 1;
      }
      url = url.substring(0, i) + loc;
    }
    extend(this, parseUrl(url));
    return this.send(follow);
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
    //todo: use indexOf
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
    //raw body -> framework buffer
    var Buffer = require('buffer').Buffer;
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
    //todo:
    /* add post headers */
    var post = null;

    if (typeof opts.post == 'object') {
      post = qs.stringify(opts.post);
      if (post.length) {
        this.addHeader('Content-Length', post.length);
        this.addHeader('Content-Type', 'application/x-www-form-urlencoded');
      }
    } else {
      //todo: verify string or buffer
      post = this.post;
      this.addHeader('Content-Length', post.length);
    }

  };

});