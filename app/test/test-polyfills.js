/*global app, define */
app.on('ready', function(require) {
  "use strict";

  var NATIVE = /\[(native code)\]/;
  if (String(Object.create).match(NATIVE)) {
    return;
  }

  var expect = require('expect');

  function beforeEach(old_it, do_before) {
    return function it(name, fn) {
      do_before.call(this);
      return old_it.apply(this, arguments);
    }
  }

  app.addTestSuite('polyfills', {
    'Date now': function(it) {
      it('should be the current time', function () {
        expect(Date.now() === new Date().getTime()).to.be(true);
      });
    },
    'Date parse': function(it) {
      // TODO: Write the rest of the test.

      it('should support extended years', function () {

        expect(Date.parse('0001-01-01T00:00:00Z')).to.be(-62135596800000);
        expect(Date.parse('+275760-09-13T00:00:00.000Z')).to.be(8.64e15);
        expect(Date.parse('+033658-09-27T01:46:40.000Z')).to.be(1e15);
        expect(Date.parse('-000001-01-01T00:00:00Z')).to.be(-62198755200000);
        expect(Date.parse('+002009-12-15T00:00:00Z')).to.be(1260835200000);

      });

      it('should work', function () {
        //Chrome 19     Opera 12      Firefox 11    IE 9          Safari 5.1.1
        expect(Date.parse("2012-11-31T23:59:59.000Z")).to.not.be.ok();           //1354406399000 NaN           NaN           1354406399000 NaN
        expect(Date.parse("2012-12-31T23:59:59.000Z")).to.be(1356998399000);   //1356998399000 1356998399000 1356998399000 1356998399000 1356998399000
        expect(Date.parse("2012-12-31T23:59:60.000Z")).to.not.be.ok();           //NaN           NaN           NaN           NaN           1356998400000
        expect(Date.parse("2012-04-04T05:02:02.170Z")).to.be(1333515722170);   //1333515722170 1333515722170 1333515722170 1333515722170 1333515722170
//        expect(Date.parse("2012-04-04T05:02:02.170999Z")).to.be(1333515722170);   //1333515722170 1333515722170 1333515722170 1333515722170 1333515722170
//        expect(Date.parse("2012-04-04T05:02:02.17Z")).to.be(1333515722170);    //1333515722170 1333515722170 1333515722170 1333515722170 1333515722170
//        expect(Date.parse("2012-04-04T05:02:02.1Z")).to.be(1333515722100);     //1333515722170 1333515722170 1333515722170 1333515722170 1333515722170
        expect(Date.parse("2012-04-04T24:00:00.000Z")).to.be(1333584000000);   //NaN           1333584000000 1333584000000 1333584000000 1333584000000
        expect(Date.parse("2012-04-04T24:00:00.500Z")).to.not.be.ok();           //NaN           NaN           1333584000500 1333584000500 NaN
        expect(Date.parse("2012-12-31T10:08:60.000Z")).to.not.be.ok();           //NaN           NaN           NaN           NaN           1356948540000
        expect(Date.parse("2012-13-01T12:00:00.000Z")).to.not.be.ok();           //NaN           NaN           NaN           NaN           NaN
        expect(Date.parse("2012-12-32T12:00:00.000Z")).to.not.be.ok();           //NaN           NaN           NaN           NaN           NaN
        expect(Date.parse("2012-12-31T25:00:00.000Z")).to.not.be.ok();           //NaN           NaN           NaN           NaN           NaN
        expect(Date.parse("2012-12-31T24:01:00.000Z")).to.not.be.ok();           //NaN           NaN           NaN           1356998460000 NaN
        expect(Date.parse("2012-12-31T12:60:00.000Z")).to.not.be.ok();           //NaN           NaN           NaN           NaN           NaN
        expect(Date.parse("2012-12-31T12:00:60.000Z")).to.not.be.ok();           //NaN           NaN           NaN           NaN           1356955260000
        expect(Date.parse("2012-00-31T23:59:59.000Z")).to.not.be.ok();           //NaN           NaN           NaN           NaN           NaN
        expect(Date.parse("2012-12-00T23:59:59.000Z")).to.not.be.ok();           //NaN           NaN           NaN           NaN           NaN
        expect(Date.parse("2012-02-29T12:00:00.000Z")).to.be(1330516800000);   //1330516800000 1330516800000 1330516800000 1330516800000 1330516800000
        expect(Date.parse("2011-02-29T12:00:00.000Z")).to.not.be.ok();           //1298980800000 NaN           NaN           1298980800000 NaN
        expect(Date.parse("2011-03-01T12:00:00.000Z")).to.be(1298980800000);   //1298980800000 1298980800000 1298980800000 1298980800000 1298980800000

        // extended years:
        expect(Date.parse("0000-01-01T00:00:00.000Z")).to.be(-621672192e5);    //-621672192e5  -621672192e5  -621672192e5  -621672192e5  -621672192e5
        expect(Date.parse("+275760-09-13T00:00:00.000Z")).to.be(8.64e15);      //8.64e15       NaN           8.64e15       8.64e15       8.64e15
        expect(Date.parse("-271821-04-20T00:00:00.000Z")).to.be(-8.64e15);     //-8.64e15      NaN           -8.64e15      -8.64e15      -8.6400000864e15
        expect(Date.parse("+275760-09-13T00:00:00.001Z")).to.not.be.ok();        //NaN           NaN           NaN           8.64e15 + 1   8.64e15 + 1
        expect(Date.parse("-271821-04-19T23:59:59.999Z")).to.not.be.ok();        //NaN           NaN           NaN           -8.64e15 - 1  -8.6400000864e15 - 1

        // https://github.com/kriskowal/es5-shim/issues/80 Safari bug with leap day
        expect(Date.parse("2034-03-01T00:00:00.000Z") -
            Date.parse("2034-02-27T23:59:59.999Z")).to.be(86400001);   //86400001      86400001       86400001       86400001      1

        // Time Zone Offset
        expect(Date.parse("2012-01-29T12:00:00.000+01:00")).to.be(132783480e4);//132783480e4 132783480e4  132783480e4  132783480e4     132783480e4
        expect(Date.parse("2012-01-29T12:00:00.000-00:00")).to.be(132783840e4);//132783840e4 132783840e4  132783840e4  132783840e4     132783840e4
        expect(Date.parse("2012-01-29T12:00:00.000+00:00")).to.be(132783840e4);//132783840e4 132783840e4  132783840e4  132783840e4     132783840e4
        expect(Date.parse("2012-01-29T12:00:00.000+23:59")).to.be(132775206e4);//132775206e4 132775206e4  132775206e4  132775206e4     132775206e4
        expect(Date.parse("2012-01-29T12:00:00.000-23:59")).to.be(132792474e4);//132792474e4 132792474e4  132792474e4  132792474e4     132792474e4
        expect(Date.parse("2012-01-29T12:00:00.000+24:00")).to.not.be.ok();      //NaN         1327752e6    NaN          1327752000000   1327752000000
        expect(Date.parse("2012-01-29T12:00:00.000+24:01")).to.not.be.ok();      //NaN         NaN          NaN          1327751940000   1327751940000
        expect(Date.parse("2012-01-29T12:00:00.000+24:59")).to.not.be.ok();      //NaN         NaN          NaN          1327748460000   1327748460000
        expect(Date.parse("2012-01-29T12:00:00.000+25:00")).to.not.be.ok();      //NaN         NaN          NaN          NaN             NaN
        expect(Date.parse("2012-01-29T12:00:00.000+00:60")).to.not.be.ok();      //NaN         NaN          NaN          NaN             NaN
        expect(Date.parse("-271821-04-20T00:00:00.000+00:01")).to.not.be.ok();   //NaN         NaN          NaN          -864000000006e4 -864000008646e4
        expect(Date.parse("-271821-04-20T00:01:00.000+00:01")).to.be(-8.64e15);//-8.64e15    NaN          -8.64e15     -8.64e15        -864000008640e4

        // When time zone is missed, local offset should be used (ES 5.1 bug)
        // see https://bugs.ecmascript.org/show_bug.cgi?id=112
        var tzOffset = Number(new Date(1970, 0));
        // same as (new Date().getTimezoneOffset() * 60000)
        expect(Date.parse('1970-01-01T00:00:00')).to.be(tzOffset);             //tzOffset    0            0            0               NaN
      });

      it("should be able to coerce to a number", function() {
        var actual = Number(new Date(1970, 0));
        var expected = parseInt(actual, 10);
        expect(isFinite(actual)).to.be(true);
        expect(actual).to.eql(expected);
        expect(isNaN(actual)).to.not.be.ok();
      });
    },
    'Date toString': function(it) {
      var actual = (new Date(1970, 0)).toString();
      it = beforeEach(it, function() {
        actual = (new Date(1970, 0)).toString();
      });
      it("should show correct date info for " + actual, function() {
        expect(actual).to.match(/1970/);
        expect(actual).to.match(/jan/i);
        expect(actual).to.match(/thu/i);
        expect(actual).to.match(/00:00:00/);
      });
    },
    'Date valueOf': function(it) {
      // Note that new Date(1970, 0).valueOf() is 0 in UTC timezone.
      // Check check that it's a number (and an int), not that it's "truthy".
      var actual = (new Date(1970, 0));
      it = beforeEach(it, function() {
        actual = (new Date(1970, 0)).valueOf();
      });
      it("should give a numeric value", function() {
        expect(actual).to.be.a("number");
      });
      it("should not be NaN", function() {
        expect(isNaN(actual)).to.be(false);
      });
      it("should give an int value", function() {
        expect(actual).to.be(Math.floor(actual));
      });
    },
    'Date toISOString': function(it) {
      it('should support extended years', function () {
        expect(new Date(-62198755200000).toISOString().indexOf('-000001-01-01')).to.be(0);
        expect(new Date(8.64e15).toISOString().indexOf('+275760-09-13')).to.be(0);
      });

      it('should return correct dates', function () {
        expect(new Date(-1).toISOString()).to.be('1969-12-31T23:59:59.999Z');// Safari 5.1.5 "1969-12-31T23:59:59.-01Z"
        expect(new Date(-3509827334573292).toISOString()).to.be('-109252-01-01T10:37:06.708Z'); // Opera 11.61/Opera 12 bug with Date#getUTCMonth
      });
    },
    'Date toJSON': function(it) {
      // Opera 11.6x/12 bug
      it('should call toISOString', function () {
        var date = new Date(0);
        date.toISOString = function () {
          return 1;
        };
        expect(date.toJSON()).to.be(1);
      });

      it('should return null for not finite dates', function () {
        var date = new Date(NaN),
            json;
        try {
          json = date.toJSON();
        } catch (e) {}
        expect(json).to.be(null);
      });

      it('should return the isoString when stringified', function () {
        var date = new Date();
        expect(JSON.stringify(date.toISOString())).to.be(JSON.stringify(date));
      })
    },
    'Function bind': function(it) {
      var actual, testSubject;

      testSubject = {
        push: function(o) {
          this.a.push(o);
        }
      };

      function func() {
        Array.prototype.forEach.call(arguments, function(a) {
          this.push(a);
        }, this);
        return this;
      }

      it = beforeEach(it, function() {
        actual = [];
        testSubject.a = [];
      });

      it('binds properly without a context', function() {
        var context;
        testSubject.func = function() {
          context = this;
        }.bind();
        testSubject.func();
        expect(context).to.be(function() {return this}.call());
      });
      it('binds properly without a context, and still supplies bound arguments', function() {
        var a, context;
        testSubject.func = function() {
          a = Array.prototype.slice.call(arguments);
          context = this;
        }.bind(undefined, 1,2,3);
        testSubject.func(1,2,3);
        expect(a).to.eql([1,2,3,1,2,3]);
        expect(context).to.be(function() {return this}.call());
      });
      it('binds a context properly', function() {
        testSubject.func = func.bind(actual);
        testSubject.func(1,2,3);
        expect(actual).to.eql([1,2,3]);
        expect(testSubject.a).to.eql([]);
      });
      it('binds a context and supplies bound arguments', function() {
        testSubject.func = func.bind(actual, 1,2,3);
        testSubject.func(4,5,6);
        expect(actual).to.eql([1,2,3,4,5,6]);
        expect(testSubject.a).to.eql([]);
      });

      it('returns properly without binding a context', function() {
        testSubject.func = function() {
          return this;
        }.bind();
        var context = testSubject.func();
        expect(context).to.be(function() {return this}.call());
      });
      it('returns properly without binding a context, and still supplies bound arguments', function() {
        var context;
        testSubject.func = function() {
          context = this;
          return Array.prototype.slice.call(arguments);
        }.bind(undefined, 1,2,3);
        actual = testSubject.func(1,2,3);
        expect(context).to.be(function() {return this}.call());
        expect(actual).to.eql([1,2,3,1,2,3]);
      });
      it('returns properly while binding a context properly', function() {
        var ret;
        testSubject.func = func.bind(actual);
        ret = testSubject.func(1,2,3);
        expect(ret).to.be(actual);
        expect(ret).not.to.be(testSubject);
      });
      it('returns properly while binding a context and supplies bound arguments', function() {
        var ret;
        testSubject.func = func.bind(actual, 1,2,3);
        ret = testSubject.func(4,5,6);
        expect(ret).to.be(actual);
        expect(ret).not.to.be(testSubject);
      });
      it('passes the correct arguments as a constructor', function() {
        var ret, expected = { name: "Correct" };
        testSubject.func = function(arg) {
          return arg;
        }.bind({ name: "Incorrect" });
        ret = new testSubject.func(expected);
        expect(ret).to.be(expected);
      });
      it('returns the return value of the bound function when called as a constructor', function () {
        var oracle = [1, 2, 3];
        var subject = function () {
          return oracle;
        }.bind(null);
        var result = new subject;
        expect(result).to.be(oracle);
      });
      it('returns the correct value if constructor returns primitive', function() {
        var oracle = [1, 2, 3];
        var subject = function () {
          return oracle;
        }.bind(null);
        var result = new subject;
        expect(result).to.be(oracle);

        oracle = {};
        result = new subject;
        expect(result).to.be(oracle);

        oracle = function() {};
        result = new subject;
        expect(result).to.be(oracle);

        oracle = "asdf";
        result = new subject;
        expect(result).not.to.be(oracle);

        oracle = null;
        result = new subject;
        expect(result).not.to.be(oracle);

        oracle = true;
        result = new subject;
        expect(result).not.to.be(oracle);

        oracle = 1;
        result = new subject;
        expect(result).not.to.be(oracle);
      });
      it('returns the value that instance of original "class" when called as a constructor', function() {
        var classA = function(x) {
          this.name = x || "A";
        }
        var classB = classA.bind(null, "B");

        var result = new classB;
        expect(result instanceof classA).to.be(true);
        expect(result instanceof classB).to.be(true);
      });
    },
    'Number toFixed': function(it) {
      it('should convert numbers correctly', function () {
//        expect((0.00008).toFixed(3)).to.be('0.000');
//        expect((0.9).toFixed(0)).to.be('1');
//        expect((1.255).toFixed(2)).to.be('1.25');
        expect((1843654265.0774949).toFixed(5)).to.be('1843654265.07749');
//        expect((1000000000000000128).toFixed(0)).to.be('1000000000000000128');
      });
    },
    'Object.keys': function(it) {
      var obj = {
        "str": "boz",
        "obj": { },
        "arr": [],
        "bool": true,
        "num": 42,
        "null": null,
        "undefined": undefined
      };

      var loopedValues = [];
      for (var k in obj) {
        loopedValues.push(k);
      }

      var keys = Object.keys(obj);
      it('should have correct length', function () {
        expect(keys.length).to.be(7);
      });

      it('should return an Array', function () {
        expect(Array.isArray(keys)).to.be(true);
      });

      it('should return names which are own properties', function () {
        keys.forEach(function (name) {
          expect(obj.hasOwnProperty(name)).to.be(true);
        });
      });

      it('should return names which are enumerable', function () {
        keys.forEach(function (name) {
          expect(loopedValues.indexOf(name)).to.not.be(-1);
        })
      });

      it('should throw error for non object', function () {
        var e = {};
        //todo
        expect(function () {
          try {
            Object.keys(42)
          } catch (err) {
            throw e;
          }
        }).to.throwError(e);
      });
    },
    'Object.isExtensible': function(it) {
      var obj = { };

      it('should return true if object is extensible', function () {
        expect(Object.isExtensible(obj)).to.be(true);
      });

//      it('should return false if object is not extensible', function () {
//        expect(Object.isExtensible(Object.preventExtensions(obj))).to.be(false);
//      });

//      it('should return false if object is sealed', function () {
//        expect(Object.isExtensible(Object.seal(obj))).to.be(false);
//      });

//      it('should return false if object is frozen', function () {
//        expect(Object.isExtensible(Object.freeze(obj))).to.be(false);
//      });

      it('should throw error for non object', function () {
        var e1 = {};
        //todo
        expect(function () {
          try {
            Object.isExtensible(42)
          } catch (err) {
            throw e1;
          }
        }).to.throwError(e1);
      });
    },
    'Object.defineProperty': function(it) {
      var obj;

      it = beforeEach(it, function() {
        obj = {};

        Object.defineProperty(obj, 'name', {
          value : 'Testing',
          configurable: true,
          enumerable: true,
          writable: true
        });
      });

      it('should return the initial value', function () {
        expect(obj.hasOwnProperty('name')).to.be.ok();
        expect(obj.name).to.be('Testing');
      });

      it('should be setable', function () {
        obj.name = 'Other';
        expect(obj.name).to.be('Other');
      });

      it('should return the parent initial value', function () {
        var child = Object.create(obj, {});

        expect(child.name).to.be('Testing');
        expect(child.hasOwnProperty('name')).to.not.be.ok();
      });

      it('should not override the parent value', function () {
        var child = Object.create(obj, {});

        Object.defineProperty(child, 'name', {
          value : 'Other'
        });

        expect(obj.name).to.be('Testing');
        expect(child.name).to.be('Other');
      });

      it('should throw error for non object', function () {
        expect(function () {
          Object.defineProperty(42, 'name', {});
        }).to.throwError();
      });
    },
    'Object.getOwnPropertyDescriptor': function(it) {
      it('should return undefined because the object does not own the property', function () {
        var descr = Object.getOwnPropertyDescriptor({}, 'name');

        expect(descr).to.be.a('undefined')
      });

      it('should return a data descriptor', function () {
        var descr = Object.getOwnPropertyDescriptor({name: 'Testing'}, 'name');

        expect(descr).to.not.be.a('undefined');
        expect(descr.value).to.be('Testing');
        expect(descr.writable).to.be(true);
        expect(descr.enumerable).to.be(true);
        expect(descr.configurable).to.be(true);
      });

      it('should return undefined because the object does not own the property', function () {
        var descr = Object.getOwnPropertyDescriptor(Object.create({name: 'Testing'}, {}), 'name');

        expect(descr).to.be.a('undefined');
      });

      it('should return a data descriptor', function () {
        var obj = Object.create({}, {
          name: {
            value : 'Testing',
            configurable: true,
            enumerable: true,
            writable: true
          }
        });

        var descr = Object.getOwnPropertyDescriptor(obj, 'name');

        expect(descr).to.not.be.a('undefined');
        expect(descr.value).to.be('Testing');
        expect(descr.writable).to.be(true);
        expect(descr.enumerable).to.be(true);
        expect(descr.configurable).to.be(true);
      });

      it('should throw error for non object', function () {
        expect(function () {
          Object.getOwnPropertyDescriptor(42, 'name');
        }).to.throwError();
      });
    },
//    'Object.create(null)': function() {
//      var o = Object.create(null);
//      expect(o.toString).to.be(null);
//    },
    'Object.create()': function() {
      var a = {type: 1};
      var b = Object.create(a);
      expect(b.type).to.be(1);
      b.type = 2;
      expect(b.type).to.be(2);
      delete b.type;
      expect(b.type).to.be(1);
    },
    'String trim': function(it) {
      var test = "\x09\x0A\x0B\x0C\x0D\x20\xA0\u1680\u180E\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\u2028\u2029\uFEFFHello, World!\x09\x0A\x0B\x0C\x0D\x20\xA0\u1680\u180E\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\u2028\u2029\uFEFF";
      it('trims all ES5 whitespace', function() {
        expect(test.trim()).to.be("Hello, World!");
        expect(test.trim().length).to.be(13);
      });
    }
  });

});