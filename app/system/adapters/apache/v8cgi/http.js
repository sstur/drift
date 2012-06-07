/*global app, define */

//these use v8cgi require
var TLS = require("tls").TLS;
var Socket = require("socket").Socket;
var Buffer = require("binary").Buffer;

define('http', function(require, exports) {
  "use strict";

  var qs = require('qs');

  //todo: add optional second param opts (for max_follow)
  function ClientRequest(url) {
    this._headers = {};
    this.method = "GET";
    this.get = {};
    this.post = {};

    var u = url;
    var index = u.indexOf("?");
    if (index != -1) {
      /* parse user-supplied get */
      u = url.substring(0, index);
      var querystring = url.substring(index + 1);
      this.get = qs.parse(querystring);
    }

    if (u.indexOf("://") == -1) {
      u = "http://" + u;
    }
    if (u.indexOf("/", 8) == -1) {
      u += "/";
    }
    this._url = u;
  }

  ClientRequest.prototype.addHeaders = function(obj) {
    for (var p in obj) {
      this._headers[p] = obj[p];
    }
  };

  ClientRequest.prototype.send = function(follow) {
    var items = this._splitUrl();
    var proto = items[0];
    var host = items[1];
    var port = items[2];
    var url = items[3];
    var hiddenSocket = null;
    this.addHeaders({"Host": host});

    /* defaults */
    this.addHeaders({
      "Connection": "close",
      "Accept-Charset": "utf-8",
      "Accept-Encoding": "identity"
    });

    /* add get data */
    var get = this._serialize(this.get);
    if (get) {
      url += "?" + get;
    }

    /* add post headers */
    var post = null;
    if (typeof this.post == "object") {
      post = this._serialize(this.post);
      if (post.length) {
        this.addHeaders({
          "Content-Length": post.length,
          "Content-Type": "application/x-www-form-urlencoded"
        });
      }
    } else {
      post = this.post;
      this.addHeaders({"Content-Length": post.length});
    }

    /* build request */
    var data = this.method + " " + url + " HTTP/1.1\r\n";
    for (var p in this._headers) {
      data += p + ": " + this._headers[p] + "\r\n";
    }
    data += "\r\n";
    if (post) {
      data += post;
    }

    var protocol = Socket.PF_INET;
    var ip = null;
    try {
      ip = Socket.getAddrInfo(host, Socket.PF_INET6).split('%', 1)[0];
      protocol = Socket.PF_INET6;
    } catch(e) {
      ip = Socket.getAddrInfo(host, Socket.PF_INET);
    }
    var socket = new Socket(protocol, Socket.SOCK_STREAM, Socket.IPPROTO_TCP);
    socket.connect(ip, port);

    if (proto == "https") {
      /* wrap in a TLS connection */
      hiddenSocket = socket;
      socket = new TLS(socket);
      socket.connect();
    }

    /* send request */
    socket.send(data);

    var received = new Buffer(0);
    do {
      var part = socket.receive(1024);
      var tmp = new Buffer(received.length + part.length);
      tmp.copyFrom(received);
      tmp.copyFrom(part, 0, received.length);
      received = tmp;
    } while (part.length > 0);

    if (hiddenSocket) {
      /* unwrap and close TLS connection */
      socket.close();
      socket = socket.getSocket();
    }

    socket.close();

    return this._handleResponse(received, follow);
  };

  ClientRequest.prototype._serialize = function(obj) {
    var arr = [];
    for (var p in obj) {
      var val = obj[p];
      if (!(val instanceof Array)) {
        val = [val];
      }
      for (var i = 0, len = val.length; i < len; i++) {
        arr.push(encodeURIComponent(p) + "=" + encodeURIComponent(val[i]));
      }
    }
    return arr.join("&");
  };

  ClientRequest.prototype._splitUrl = function() {
    var parts = this._url.match(/^ *((https?):\/\/)?([^:\/]+)(:([0-9]+))?(.*)$/);
    var proto = parts[2] || "http";
    var host = parts[3];
    var port = parts[5] || (parts[2] == "https" ? 443 : 80);
    var url = parts[6];
    return [proto, host, port, url];
  };

  /**
   * @param {Buffer} data
   * @param {bool} follow Follow redirects?
   *
   * todo: follow should be an integer indicating the MAX redirects to follow
   */
  ClientRequest.prototype._handleResponse = function(buffer, follow) {
    var codes = [301, 302, 303, 307];
    var r = new ClientResponse(buffer);
    if (!follow) {
      return r;
    }

    var code = r.status;
    if (codes.indexOf(code) == -1) {
      return r;
    }

    var loc = r.getHeader("Location");
    if (!loc) {
      return r;
    }

    if (code == 302 || code == 303) {
      /*
        302 should not be used for switching to GET, but...
        see http://en.wikipedia.org/wiki/HTTP_302 ;)
      */
      this.method = "GET";
    }
    if (loc.indexOf("://") != -1) {
      /* absolute URI, standards compliant */
      this._url = loc;
    } else {
      /* relative URI */
      if (loc.charAt(0) == "/") {
        var i = this._url.indexOf("/", 8);
      } else {
        var i = this._url.lastIndexOf("/") + 1;
      }
      this._url = this._url.substring(0, i) + loc;
    }
    return this.send(follow);
  };


  function ClientResponse(buffer) {
    this.data = null;
    this.status = 0;
    this.statusReason = "";
    this._headers = {};

    var index = buffer.indexOf("\r\n\r\n");

    if (index == -1) {
      throw new Error("No header-body separator found");
    }
    var head = buffer.range(0, index).toString("utf-8");
    var body = buffer.range(index + 4);
    var arr = head.split("\r\n");

    var parts = arr.shift().match(/^ *http\/[^ ]+ *([0-9]+) *(.*)$/i);
    this.status = parseInt(parts[1], 10);
    this.statusReason = parts[2] || "";

    for (var i = 0, len = arr.length; i < len; i++) {
      var parts = arr[i].match(/^ *([^: ]+) *: *(.*)$/);
      if (parts) {
        this._headers[parts[1].toLowerCase()] = parts[2];
      }
    }

    if (this.getHeader("Transfer-encoding") == "chunked") {
      this.data = this._parseChunked(body);
    } else {
      this.data = body;
    }
  }

  ClientResponse.prototype.getHeader = function(name) {
    return this._headers[name.toLowerCase()];
  };

  ClientResponse.prototype.getHeaders = function() {
    return this._headers;
  };

  /**
   * @param {Buffer} body
   */
  ClientResponse.prototype._parseChunked = function(body) {
    var index = 0
    var num, hex;
    var result = new Buffer(0);

    while (index < body.length) {
      hex = "";

      /* fetch hex number at the beginning of each chunk. this is terminated by \r\n */
      while (index < body.length) {
        num = body[index];
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
      var tmp = new Buffer(result.length + chunkLength);
      tmp.copyFrom(result);
      tmp.copyFrom(body, index, result.length);
      result = tmp;
      index += chunkLength;

      /* skip CRLF after chunk */
      index += 2;
    }

    return result;
  };


  //todo: wrap request interface and return ClientResponse instance

  exports.ClientRequest = ClientRequest;
  exports.ClientResponse = ClientResponse;

});