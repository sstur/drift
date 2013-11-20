/*global app, define */
app.on('ready', function(require) {
  "use strict";

  var qs = require('qs');
  var crypto = require('crypto');
  var expect = require('expect');
  var Request = require('request');
  var Response = require('response');
  var AdapterRequest = require('mock-request');
  var AdapterResponse = require('mock-response');
  var blob = new Array(256);
  for (var i = 0; i < 256; i++) blob[i] = String.fromCharCode(i);
  blob = new Buffer(blob, 'binary');

  app.addTestSuite('request', {
    'url parsing': function() {
      var req = createRequest('/go?a=1');
      expect(req.url()).to.be('/go?a=1');
      expect(req.url('raw')).to.be('/go?a=1');
      expect(req.url('rawPath')).to.be('/go');
      expect(req.url('path')).to.be('/go');
      expect(req.url('search')).to.be('?a=1');
      expect(req.url('qs')).to.be('a=1');
      req = createRequest('/');
      expect(req.url('search')).to.be('');
      expect(req.url('qs')).to.be('');
    },
    'qs parsing': function() {
      var req = createRequest('/go?a=1&B=2');
      expect(req.query()).to.eql({a: '1', b: '2'});
      req = createRequest('/go?a=1&A=2');
      expect(req.query('a')).to.be('1, 2');
      req = createRequest('/');
      expect(req.query('b')).to.be('');
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
      var req = createRequest();
      expect(req.method()).to.be('GET');
      expect(req.method('GET')).to.be(true);
      expect(req.method('POST')).to.be(false);
      req = createRequest({method: 'POST'});
      expect(req.method()).to.be('POST');
      req = createRequest({method: 'PUT'});
      expect(req.method('PUT')).to.be(true);
      req = createRequest({method: 'delete'});
      expect(req.method('DELETE')).to.be(true);
      req = createRequest({headers: {'X-HTTP-Method-Override': 'POST'}});
      expect(req.method()).to.be('POST');
      req = createRequest({url: '/?_method=head'});
      expect(req.method('head')).to.be(true);
    },
    'headers': function() {
      var req = createRequest({headers: {'User-Agent': 'Mock'}});
      expect(req.headers('user-agent')).to.be('Mock');
      expect(req.headers('User-Agent')).to.be('Mock');
      req = createRequest({
        headers: 'User-Agent: Mock\nX-Accel:None\r\nX-Double :a:b: c'
      });
      expect(req.headers('user-agent')).to.be('Mock');
      expect(req.headers('X-Accel')).to.be('None');
      expect(req.headers('X-Double')).to.be('a:b: c');
      expect(req.headers('X-NotExist')).to.be('');
    },
    'isAjax': function() {
      var req = createRequest({headers: 'X-Requested-With: XMLHttpRequest'});
      expect(req.headers('x-requested-with')).to.be('XMLHttpRequest');
      expect(req.isAjax()).to.be(true);
      req = createRequest();
      expect(req.isAjax()).to.be(false);
    },
    'cookie parsing': function() {
      var req = createRequest({headers: 'Cookie: SID=VGcnZXqyEPtNSWa8Rd7fDyoJxR8OfYm2; EULA=1; eula=2'});
      expect(req.cookies('sid')).to.be('VGcnZXqyEPtNSWa8Rd7fDyoJxR8OfYm2');
      expect(req.cookies('EULA')).to.be('1, 2');
      expect(req.cookies('None')).to.be('');
    },
    'form body parsing': function() {
      var req = constructFormRequest([
        {name: 'a', value: 1},
        {name: 'b', value: false},
        {name: 'c', value: '✔'}
      ]);
      expect(req.body()).to.eql({a: '1', b: 'false', c: '✔'});
      req = constructFormRequest([
        {name: 'a', value: 1},
        {name: 'a', value: 2},
        {name: 'b', value: '='}
      ]);
      var body = req.body();
      expect(body).to.eql({a: '1, 2', b: '='});
      expect(req.body('c')).to.be.an('undefined');
    },
    'multipart parsing': function() {
      var req = createMultipartRequest({
        fields: [{name: 'username', value: 'admin'}],
        files: [{
          name: 'image',
          filename: 'image.gif',
          type: 'image/gif',
          value: blob
        }]
      });
      var body = req.body();
      expect(body.username).to.be('admin');
      expect(body.image.type).to.be('file');
      expect(body.image.name).to.be('image');
      expect(body.image.fileName).to.be('image.gif');
      expect(body.image.contentType).to.be('image/gif');
      expect(body.image.size).to.be(blob.length);
      expect(body.image.hash).to.be(crypto.hash('md5', blob).toString('hex'));
      //duplicate keys have their values concatenated
      req = createMultipartRequest({
        fields: [{name: '✔', value: 'a'}, {name: '✔', value: 'für'}]
      });
      body = req.body();
      expect(body['✔']).to.be('a, für');
      //files can have unicode name/filename; req should emit file
      req = createMultipartRequest({
        files: [{name: '✔', value: blob}]
      });
      var files = [];
      req.on('file', function(file) {
        expect(file.on).to.be.a('function');
        files.push(file);
      });
      body = req.body();
      expect(body['✔']).to.be(files[0]);
      expect(files[0].size).to.be(256);
      expect(files[0].hash).to.be('6e2595104d0a9a2f4c66802e0f5b4273');
      //body contains only first file, but req emits both
      req = createMultipartRequest({
        files: [
          {name: 'file', value: new Buffer('first')},
          {name: 'file', value: new Buffer('second')}
        ]
      });
      files = [];
      req.on('file', function(file) {
        files.push(file);
      });
      body = req.body();
      expect(files[0].size).to.be(5);
      expect(files[1].size).to.be(6);
      expect(body.file.size).to.be(5);
    },
    'part header overflow': function() {
      var headers = {};
      for (var i = 0; i < 100; i++) {
        headers['X-Header-' + i] = 'This is a long header that should cause overflow';
      }
      var req = createMultipartRequest({
        files: [{
          name: 'file',
          headers: headers,
          value: blob
        }]
      });
      var exception;
      try {
        req.body();
      } catch(e) {
        exception = e;
      }
      expect(exception).to.be(null);
      var rawRes = req.res._super;
      expect(rawRes.status).to.be('400 Bad Request');
      expect(rawRes.getBody()).to.contain('Multipart Headers Too Large');
    }
  });


  function createRequest(cfg) {
    var req = new Request(new AdapterRequest(cfg));
    var res = new Response(new AdapterResponse());
    req.res = res;
    res.req = req;
    return req;
  }

  function constructFormRequest(fields) {
    var data = [];
    fields.forEach(function(field) {
      data.push(qs.escape(field.name) + '=' + qs.escape(field.value));
    });
    data = data.join('&');
    return createRequest({
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': data.length
      },
      body: data
    });
  }

  function createMultipartRequest(cfg) {
    cfg.boundary = cfg.boundary || 'vXBUZWeMvYUeW9P6lxTi';
    var data = constructMultipart(cfg);
    var req = createRequest({
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data; boundary=' + cfg.boundary,
        'Content-Length': data.length
      },
      body: data
    });
    req.rawBody = data;
    return req;
  }

  function constructMultipart(cfg) {
    var body = [];
    var boundary = cfg.boundary;
    var fields = cfg.fields || [];
    fields.forEach(function(field) {
      body.push('--' + boundary);
      body.push('Content-Disposition: form-data; name="' + encodeURI(field.name) + '"');
      body.push('');
      var value = new Buffer(field.value, 'utf8');
      body.push(value.toString('binary'));
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