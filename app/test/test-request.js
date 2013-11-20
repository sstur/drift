/*!
 * todo: req body types
 * todo: res should throw null when invalid req body
 */
/*global app, define */
app.on('ready', function(require) {
  "use strict";

  var crypto = require('crypto');
  var expect = require('expect');
  var Request = require('request');
  var Response = require('response');
  var AdapterRequest = require('mock-request');
  var AdapterResponse = require('mock-response');

  app.addTestSuite('request', {
    'url parsing': function() {
      var req = createRequest('/go?a=1');
      expect(req.url()).to.be('/go?a=1');
      expect(req.url('raw')).to.be('/go?a=1');
      expect(req.url('rawPath')).to.be('/go');
      expect(req.url('path')).to.be('/go');
      expect(req.url('search')).to.be('?a=1');
      expect(req.url('qs')).to.be('a=1');
    },
    'qs parsing': function() {
      var req = createRequest('/go?a=1&B=2');
      expect(req.query()).to.eql({a: '1', b: '2'});
    },
    'unicode path escaped': function() {
      var req = createRequest('/f%FCr/f%fcr?a=f%3D%3dr');
      expect(req.url('raw')).to.be('/f%FCr/f%fcr?a=f%3D%3dr');
      expect(req.url('rawPath')).to.be('/f%FCr/f%fcr');
      expect(req.url('path')).to.be('/für/für');
      expect(req.url('search')).to.be('?a=f%3D%3dr');
      expect(req.url('qs')).to.be('a=f%3D%3dr');
      expect(req.query('a')).to.be('f==r');
    },
    'unicode path utf8': function() {
      var req = createRequest('/f%C3%bcr?a=f%C3%bcr');
      expect(req.url('raw')).to.be('/f%C3%bcr?a=f%C3%bcr');
      expect(req.url('rawPath')).to.be('/f%C3%bcr');
      expect(req.url('path')).to.be('/für');
      expect(req.url('search')).to.be('?a=f%C3%bcr');
      expect(req.url('qs')).to.be('a=f%C3%bcr');
      expect(req.query('a')).to.be('für');
    },
    'method': function() {
      var req = createRequest({url: '/'});
      expect(req.method()).to.be('GET');
      expect(req.method('GET')).to.be(true);
      expect(req.method('POST')).to.be(false);
      req = createRequest({method: 'POST', url: '/'});
      expect(req.method()).to.be('POST');
      req = createRequest({method: 'PUT', url: '/'});
      expect(req.method('PUT')).to.be(true);
      req = createRequest({method: 'delete', url: '/'});
      expect(req.method('DELETE')).to.be(true);
      req = createRequest({url: '/', headers: {'X-HTTP-Method-Override': 'POST'}});
      expect(req.method()).to.be('POST');
      req = createRequest({url: '/?_method=head'});
      expect(req.method('head')).to.be(true);
    },
    'headers': function() {
      var req = createRequest({url: '/', headers: {'User-Agent': 'Mock'}});
      expect(req.headers('user-agent')).to.be('Mock');
      expect(req.headers('User-Agent')).to.be('Mock');
      req = createRequest({
        url: '/',
        headers: 'User-Agent: Mock\nX-Accel:None\r\nX-Double :a:b: c'
      });
      expect(req.headers('user-agent')).to.be('Mock');
      expect(req.headers('X-Accel')).to.be('None');
      expect(req.headers('X-Double')).to.be('a:b: c');
    },
    'isAjax': function() {
      var req = createRequest({url: '/', headers: 'X-Requested-With: XMLHttpRequest'});
      expect(req.headers('x-requested-with')).to.be('XMLHttpRequest');
      expect(req.isAjax()).to.be(true);
    },
    'cookie parsing': function() {
      var req = createRequest({url: '/', headers: 'Cookie: SID=VGcnZXqyEPtNSWa8Rd7fDyoJxR8OfYm2; EULA=1'});
      expect(req.cookies('sid')).to.be('VGcnZXqyEPtNSWa8Rd7fDyoJxR8OfYm2');
      expect(req.cookies('EULA')).to.be('1');
    },
    'body parsing': function() {
      var file = new Buffer('4749463839610100010080FF00C0C0C000000021F90401000000002C00000000010001000002024401003B', 'hex');
      var req = createMultipartRequest({
        fields: [{
          name: 'username',
          value: 'simo'
        }],
        files: [{
          name: 'image',
          filename: 'image.gif',
          type: 'image/gif',
          value: file
        }]
      });
      var body = req.body();
      expect(body.username).to.be('simo');
      expect(body.image.type).to.be('file');
      expect(body.image.name).to.be('image');
      expect(body.image.fileName).to.be('image.gif');
      expect(body.image.contentType).to.be('image/gif');
      expect(body.image.size).to.be(file.length);
      expect(body.image.hash).to.be(crypto.hash('md5', file).toString('hex'));
    }
  });

  function createRequest(cfg) {
    var req = new Request(new AdapterRequest(cfg));
    var res = new Response(new AdapterResponse());
    req.res = res;
    res.req = req;
    return req;
  }

  function createMultipartRequest(cfg) {
    cfg.boundary = cfg.boundary || 'vXBUZWeMvYUeW9P6lxTi';
    var data = constructMultipart(cfg);
    return createRequest({
      url: '/',
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data; boundary=' + cfg.boundary,
        'Content-Length': data.length
      },
      body: data
    });
  }

  function constructMultipart(cfg) {
    var body = [];
    var boundary = cfg.boundary;
    var fields = cfg.fields || [];
    fields.forEach(function(field) {
      body.push('--' + boundary);
      body.push('Content-Disposition: form-data; name="' + encodeURI(field.name) + '"');
      body.push('');
      body.push(field.value);
    });
    var files = cfg.files || [];
    files.forEach(function(file) {
      body.push('--' + boundary);
      var name = file.name;
      var filename = file.filename || name;
      body.push('Content-Disposition: form-data; name="' + encodeURI(name) + '"; filename="' + encodeURI(filename) + '"');
      var type = file.type || 'application/octet-stream';
      body.push('Content-Type: ' + type);
      var headers = file.headers || {};
      forEach(headers, function(name, value) {
        body.push(name + ': ' + value);
      });
      body.push('');
      var data = file.value;
      if (Buffer.isBuffer(data)) {
        data = data.toString('binary');
      }
      body.push(data);
    });
    body.push('--' + boundary + '--');
    body = body.join('\r\n');
    return new Buffer(body, 'binary');
  }

});