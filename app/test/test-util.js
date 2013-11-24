/*!
 * todo: date reviver edge cases
 */
/*global app, define */
app.on('ready', function(require) {
  "use strict";

  var fs = require('fs');
  var util = require('util');
  var expect = require('expect');

  var undefined = void 0;
  var dataPath = app.cfg('data_dir') || 'data/';

  app.addTestSuite('util', {
    'util.extend': function() {
      var a = {type: 1}, b = {name: 'j'};
      var c = util.extend(a, b);
      expect(c).to.be(a);
      expect(a).to.eql({type: 1, name: 'j'});
      expect(b).to.eql({name: 'j'});
      var d = util.extend({}, b, {age: 40});
      expect(d).to.eql({name: 'j', age: 40});
    },
    'util.clone': function() {
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
      //array does not get named properties
      var array = [1, 2, 3];
      array.foo = 'bar';
      clone = util.clone({array: array});
      expect(clone).to.eql({array: [1, 2, 3]});
      //object-wrapped primitives clone to primitives
      clone = util.clone({
        bool: new Boolean(true),
        number: new Number(123),
        string: new String('testme')
      });
      expect(clone).to.eql({bool: true, number: 123, string: 'testme'});
      //function to plain object
      clone = util.clone({func: function() {}});
      expect(clone).to.eql({func: {}});
    },
    'util.inherits': function() {
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
      util.inherits(Fox, Animal);
      expect(Fox.super_).to.be(Animal);
      expect(Fox.prototype.constructor).to.be(Fox);
      expect(Fox.prototype.getColor).to.be(Animal.prototype.getColor);
      //changing child proto is not reflected on parent
      Fox.prototype.getSound = function() {};
      expect(Animal.prototype.getSound).to.be(undefined);
      //changing parent proto is reflected on child proto
      Animal.prototype.type = 1;
      expect(Fox.prototype.type).to.be(1);
      var fox = new Fox('red');
      expect(fox.constructor).to.be(Fox);
      expect(fox.getColor()).to.be('red');
      //parent constructor is not called during child instantiation
      expect(fox.initialized).to.not.be(true);
    },
    'util.propagateEvents': function() {
      var e1 = app.eventify({});
      var e2 = app.eventify({});
      util.propagateEvents(e1, e2, 'first second');
      var logEvent = function(name) {
        var log = this.log || (this.log = {});
        var count = log[name] || 0;
        log[name] = count + 1;
      };
      e2.on('first', logEvent);
      e1.emit('first', 'first');
      expect(e2.log.first).to.be(1);
      e2.on('second', logEvent);
      e1.emit('second', 'second');
      e1.emit('second', 'second');
      expect(e2.log.second).to.be(2);
      e1.on('third', logEvent);
      e2.on('third', logEvent);
      e1.emit('third', 'third');
      expect(e1.log.third).to.be(1);
      expect(e2.log.third).to.be(undefined);
      util.propagateEvents(e1, e2, ['fourth', 'fifth']);
      e2.on('fifth', logEvent);
      e1.emit('fifth', 'fifth');
      expect(e2.log.fifth).to.be(1);
    },
    'util.pipe': function() {
      var blob = new Array(256);
      for (var i = 0; i < 256; i++) blob[i] = String.fromCharCode(i);
      blob = new Buffer(blob, 'binary');
      var readStream = new MockReadStream(blob);
      var writeStream = new MockWriteStream();
      util.pipe(readStream, writeStream);
      readStream.read();
      expect(writeStream.output.length).to.be(16);
      expect(writeStream.getOutput()).to.eql(blob);
    },
    'util.getUniqueHex': function() {
      var hex1 = util.getUniqueHex();
      expect(hex1).to.be.a('string');
      expect(hex1.length).to.be(32);
      var hex2 = util.getUniqueHex();
      expect(hex1).to.not.equal(hex2);
      expect(hex2).to.match(/^[0-9a-f]{32}$/);
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
    'util.htmlDec': function() {
    },
    'util.stringify': function() {
    },
    'util.parse': function() {
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