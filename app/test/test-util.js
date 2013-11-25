/*global app, define */
app.on('ready', function(require) {
  "use strict";

  var fs = require('fs');
  var util = require('util');
  var expect = require('expect');

  var undefined = void 0;
  var dataPath = app.cfg('data_dir') || 'data/';

  app.addTestSuite('util', {
    'util.extend': function(it) {
      var a = {type: 1}, b = {name: 'j'};
      var c = util.extend(a, b);
      it('should copy properties', function() {
        expect(c).to.be(a);
        expect(a).to.eql({type: 1, name: 'j'});
        expect(b).to.eql({name: 'j'});
      });
      it('should extend from multiple sources', function() {
        var d = util.extend({}, b, {age: 40});
        expect(d).to.eql({name: 'j', age: 40});
      });
    },
    'util.clone': function(it) {
      it('should clone basic types', function() {
        var original = {
          string: 'testme',
          number: Math.random(),
          'null': null,
          'undefined': undefined,
          date: new Date(),
          buffer: new Buffer('abc'),
          array: [1, '2', null, false, void 0, true]
        };
        var clone = util.clone(original);
        expect(clone).to.not.be(original);
        expect(clone).to.eql(original);
        expect(clone.date).to.not.be(original.date);
        expect(clone.date.valueOf()).to.be(original.date.valueOf());
      });
      it('should exclude named properties on array', function() {
        var array = [1, 2, 3];
        array.foo = 'bar';
        var clone = util.clone({array: array});
        expect(clone).to.eql({array: [1, 2, 3]});
      });
      it('should clone object-wrapped primitives to primitives', function() {
        var clone = util.clone({
          bool: new Boolean(true),
          number: new Number(123),
          string: new String('testme')
        });
        expect(clone).to.eql({bool: true, number: 123, string: 'testme'});
      });
      it('should clone function to plain object', function() {
        var clone = util.clone({func: function() {}});
        expect(clone).to.eql({func: {}});
      });
    },
    'util.inherits': function(it) {
      function Animal(color) {
        this.color = color;
        this.initialized = true;
      }
      Animal.prototype.getColor = function() {
        return this.color;
      };
      function Fox(color) {
        this.color = color;
      }
      it('should replace child prototype chain', function() {
        util.inherits(Fox, Animal);
        expect(Fox.super_).to.be(Animal);
        expect(Fox.prototype.constructor).to.be(Fox);
        expect(Fox.prototype.getColor).to.be(Animal.prototype.getColor);
      });
      it('should not change prototype of parent when child is modified', function() {
        Fox.prototype.getSound = function() {};
        expect(Animal.prototype.getSound).to.be(undefined);
      });
      it('should reflect on child when parent prototype is changed', function() {
        Animal.prototype.type = 1;
        expect(Fox.prototype.type).to.be(1);
        var fox = new Fox('red');
        expect(fox.constructor).to.be(Fox);
        expect(fox.getColor()).to.be('red');
      });
      it('should not call parent constructor during child instantiation', function() {
        var fox = new Fox('brown');
        expect(fox.initialized).to.not.be(true);
      });
    },
    'util.propagateEvents': function(it) {
      var e1 = app.eventify({});
      var e2 = app.eventify({});
      util.propagateEvents(e1, e2, 'first second');
      var logEvent = function(name) {
        var log = this.log || (this.log = {});
        var count = log[name] || 0;
        log[name] = count + 1;
      };
      it('should propagate event from one to another', function() {
        e2.on('first', logEvent);
        e1.emit('first', 'first');
        expect(e2.log.first).to.be(1);
      });
      it('should propagate events called twice', function() {
        e2.on('second', logEvent);
        e1.emit('second', 'second');
        e1.emit('second', 'second');
        expect(e2.log.second).to.be(2);
      });
      it('should not propagate events not specified', function() {
        e1.on('third', logEvent);
        e2.on('third', logEvent);
        e1.emit('third', 'third');
        expect(e1.log.third).to.be(1);
        expect(e2.log.third).to.be(undefined);
      });
      it('should propagate events added later', function() {
        util.propagateEvents(e1, e2, ['fourth', 'fifth']);
        e2.on('fifth', logEvent);
        e1.emit('fifth', 'fifth');
        expect(e2.log.fifth).to.be(1);
      });
    },
    'util.pipe': function(it) {
      var blob = new Array(256);
      for (var i = 0; i < 256; i++) blob[i] = String.fromCharCode(i);
      blob = new Buffer(blob, 'binary');
      it('should pipe readStream to writeStream', function() {
        var readStream = new MockReadStream(blob);
        var writeStream = new MockWriteStream();
        util.pipe(readStream, writeStream);
        readStream.read();
        expect(writeStream.output.length).to.be(16);
        expect(writeStream.getOutput()).to.eql(blob);
      });
    },
    'util.getUniqueHex': function(it) {
      var hex1 = util.getUniqueHex();
      it('should be a string of length 32', function() {
        expect(hex1).to.be.a('string');
        expect(hex1.length).to.be(32);
      });
      it('should not produce duplicates', function() {
        var hex2 = util.getUniqueHex();
        expect(hex1).to.not.equal(hex2);
        expect(hex2).to.match(/^[0-9a-f]{32}$/);
      });
    },
    'util.hexBytes': function() {
      var hex1 = util.hexBytes(10);
      expect(hex1).to.match(/^[0-9a-f]{20}$/);
    },
    'util.log': function(it) {
      var file = dataPath + 'logs/test.log';
      fs.deleteFileIfExists(file);
      it('should log primitives and objects', function() {
        util.log(1, 2, 'three', {a: 1}, 'test');
      });
      it('should log in the correct format', function() {
        var text = fs.readTextFile(file);
        expect(text).to.be.a('string');
        expect(text).to.match(/^\w{3}, \d\d \w{3} \d{4} \d\d:\d\d:\d\d UTC/);
        expect(condense(text)).to.be('2|three|{"a":1}');
      });
      fs.deleteFile(file);
      it('should add file extension', function() {
        util.log('logme', 1, 'test');
        var text = fs.readTextFile(file);
        expect(condense(text)).to.be('logme|1');
      });
      fs.deleteFile(file);
    },
    'util.parseHeaderValue': function(it) {
      it('should lowercase keys, trim values unless in quotes', function() {
        var parsed = util.parseHeaderValue("name=Dr. J ;value=\"s %C3%bCr;1 \"; field*=UTF-8'en'a%20%C3%bCb");
        expect(parsed).to.eql({name: 'Dr. J', value: 's ür;1 ', field: 'a üb'});
      });
      it('should allow keys with no value', function() {
        var parsed = util.parseHeaderValue('Content-Disposition: attachment; filename="sanitized-file"');
        expect(parsed.attachment).to.be(undefined);
        expect(parsed.filename).to.be('sanitized-file');
      });
      it('should overwrite (not concatenate) values', function() {
        var parsed = util.parseHeaderValue("Content-Disposition: filename=\"sanitized-file\"; filename*=UTF-8''unïcode%20file");
        expect(parsed.filename).to.be('unïcode file');
      });
    },
    'util.parseHeaders': function() {
      var headers = util.parseHeaders('User-Agent: Mock\nX-Accel:None\r\nX-Double :a:b: c');
      expect(headers['user-agent']).to.be('Mock');
      expect(headers['User-Agent']).to.be(undefined);
      expect(headers['x-accel']).to.be('None');
      expect(headers['x-double']).to.be('a:b: c');
      expect(headers['x-notexist']).to.be(undefined);
    },
    'util.stripFilename': function(it) {
      it('should remove unsafe, unicode and control chars', function() {
        var filename = 'a\n\\b/c"ü"t.d';
        var sanitized = util.stripFilename(filename);
        expect(sanitized).to.be('abct.d');
      });
      it('preserve space except leading/trailing', function() {
        var filename = ' a\n b ';
        var sanitized = util.stripFilename(filename);
        expect(sanitized).to.be('a b');
      });
      it('should replace unsafe chars', function() {
        var filename = 'a\n\\b/c"ü"t.d';
        var sanitized = util.stripFilename(filename, '-');
        expect(sanitized).to.be('a-b-c-t.d');
      });
      it('should replace using map before strip', function() {
        var filename = 'a "b", c';
        var sanitized = util.stripFilename(filename, '~', {'"': '\'', ',': '-'});
        expect(sanitized).to.be("a 'b'- c");
      });
    },
    'util.htmlEnc': function() {
      var html = util.htmlEnc('a & < > " c, \u00a0 ;');
      expect(html).to.be('a &amp; &lt; &gt; &quot; c, &nbsp; ;');
      html = util.htmlEnc(' & < > "', false);
      expect(html).to.be(' &amp; &lt; &gt; "');
    },
    'util.htmlDec': function(it) {
      it('should decode basic entities', function() {
        var text = util.htmlDec('a &amp; &amp; &lt; &gt; &quot; c, &nbsp; ;');
        expect(text).to.be('a & & < > " c, \u00a0 ;');
      });
      it('should decode extended entities defined in app.cfg', function() {
        var text = util.htmlDec(' &copy; &lt; &copy;');
        expect(text).to.be(' © < ©');
      });
    },
    'util.stringify': function(it) {
      it('should escape unicode chars', function() {
        var a = {a: 0, b: 'strïng', c: null};
        var str = util.stringify(a);
        expect(str).to.match(/str\\u00efng/);
      });
      it('should handle Error differently than JSON', function() {
        var date = new Date();
        var buffer = new Buffer('ü', 'utf8');
        var a = {a: 0, b: function() {}, c: 'string', d: null, e: undefined, f: date, g: new Error('fail'), h: false, i: buffer};
        var util_string = util.stringify(a);
        var b = util.extend({}, a);
        b.g = 'new Error("fail")';
        var JSON_string = JSON.stringify(b);
        expect(util_string).to.be(JSON_string);
      });
    },
    'util.parse': function(it) {
      it('should revive null, dates, buffers and errors', function() {
        var text = '{"a":0,"c":"strïng","d":null,"f":"2013-11-24T23:12:22.716Z","g":"new Error(\\"fail\\")","h":false,"i":"<Buffer c3bc>"}';
        var obj = util.parse(text);
        expect(obj.d).to.be(null);
        expect(obj.f).to.be.a(Date);
        expect(obj.f.valueOf()).to.be(1385334742716);
        expect(obj.i).to.be.a(Buffer);
        expect(obj.i.toString('hex')).to.be('c3bc');
        expect(obj.g).to.be.an(Error);
        expect(obj.g.message).to.be('fail');
      });
      it('should revive dates without milliseconds', function() {
        var text = '{"a":0,"f":"2013-11-24T23:12:22Z"}';
        var obj = util.parse(text);
        expect(obj.f).to.be.a(Date);
        expect(obj.f.valueOf()).to.be(1385334742000);
      });
    }
  });


  function condense(text) {
    var lines = text.split(/\r\n|\r|\n/);
    lines.shift();
    return lines.join('|');
  }

  function MockReadStream(input, opts) {
    this.input = input;
    this.index = 0;
    opts = opts || {};
    this.chunkSize = opts.chunkSize || 16;
    this._bytesRead = 0;
    this._bytesTotal = input.length;
  }
  app.eventify(MockReadStream.prototype);

  util.extend(MockReadStream.prototype, {
    setEncoding: function(enc) {
      throw new Error('setEncoding not implemented in MockReadStream');
    },
    _readBytes: function(bytes) {
      bytes = Math.min(bytes, this._bytesTotal - this._bytesRead);
      var start = this._bytesRead;
      this._bytesRead += bytes;
      return this.input.slice(start, this._bytesRead);
    },
    size: function() {
      return this._bytesTotal;
    },
    read: function() {
      while (this._bytesRead < this._bytesTotal) {
        this.emit('data', this._readBytes(this.chunkSize));
      }
      this.emit('end');
    }
  });


  function MockWriteStream() {
    this.encoding = 'utf8';
    this.output = [];
  }

  util.extend(MockWriteStream.prototype, {
    setEncoding: function(enc) {
      this.encoding = enc;
    },
    write: function(data, enc) {
      if (this._finished) return;
      var buffer = (Buffer.isBuffer(data)) ? data : new Buffer(data, enc || this.encoding);
      this.output.push(buffer.toString('binary'));
    },
    end: function() {
      this._finished = true;
    },
    getOutput: function() {
      return new Buffer(this.output.join(''), 'binary');
    }
  });

});