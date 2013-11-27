/*global app, define */
app.on('ready', function(require) {
  "use strict";

  var NATIVE = /\[(native code)\]/;
  if (String(Object.create).match(NATIVE)) {
    return;
  }

  var expect = require('expect');
  var undefined;
  var testSubject;

  function createArrayLikeFromArray(arr) {
    var o = {};
    Array.prototype.forEach.call(arr, function(e, i) {
      o[i]=e;
    });
    o.length = arr.length;
    return o;
  }

  function beforeEach(old_it, do_before) {
    return function it(name, fn) {
      do_before.call(this);
      return old_it.apply(this, arguments);
    }
  }

  app.addTestSuite('polyfills', {
    //note: this is only used for array tests
    beforeEach: function() {
      testSubject = [2, 3, undefined, true, 'hej', null, false, 0];
      delete testSubject[1];
    },

    'Date.now': function(it) {
      it('should be the current time', function () {
        expect(Date.now() === new Date().getTime()).to.be(true);
      });
    },

    'Date.parse': function(it) {
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
    },

    'Array forEach': function(it) {
      "use strict";
      var expected, actual;

      it = beforeEach(it, function() {
        expected = {0:2, 3:true, 4: 'hej', 5:null, 6:false, 7:0 };
        actual = {};
      });
//      it('should pass the right parameters', function() {
//        var callback = createSpy('callback'),
//            array = ['1'];
//        array.forEach(callback);
//        expect(callback).toHaveBeenCalledWith('1', 0, array);
//      });
      it('should not affect elements added to the array after it has begun', function() {
        var arr = [1,2,3],
            i = 0;
        arr.forEach(function(a) {
          i++;
          arr.push(a+3);
        });
        expect(arr).to.eql([1,2,3,4,5,6]);
        expect(i).to.be(3);
      });

      it('should set the right context when given none', function() {
        var context;
        [1].forEach(function() {context = this;});
        expect(context).to.be(function() {return this}.call());
      });
      it('should iterate all', function() {
        testSubject.forEach(function(obj, index) {
          actual[index] = obj;
        });
        expect(actual).to.eql(expected);
      });
      it('should iterate all using a context', function() {
        var o = { a: actual };

        testSubject.forEach(function(obj, index) {
          this.a[index] = obj;
        }, o);
        expect(actual).to.eql(expected);
      });

      it('should iterate all in an array-like object', function() {
        var ts = createArrayLikeFromArray(testSubject);
        Array.prototype.forEach.call(ts, function(obj, index) {
          actual[index] = obj;
        });
        expect(actual).to.eql(expected);
      });
      it('should iterate all in an array-like object using a context', function() {
        var ts = createArrayLikeFromArray(testSubject),
            o = { a: actual };

        Array.prototype.forEach.call(ts, function(obj, index) {
          this.a[index] = obj;
        }, o);
        expect(actual).to.eql(expected);
      });

      //strings
      (function() {
        var str = 'Hello, World!',
            toString = Object.prototype.toString;
        it('should iterate all in a string', function() {
          actual = [];
          Array.prototype.forEach.call(str, function(item, index) {
            actual[index] = item;
          });
          expect(actual).to.eql(str.split(''));
        });
        it('should iterate all in a string using a context', function() {
          actual = [];
          var o = { a: actual };
          Array.prototype.forEach.call(str, function(item, index) {
            this.a[index] = item;
          }, o);
          expect(actual).to.eql(str.split(''));
        });
        it('should have String object for third argument of callback', function() {
          Array.prototype.forEach.call(str, function(item, index, obj) {
            actual = obj;
          });
          expect(typeof actual).to.be("object");
          expect(toString.call(actual)).to.be("[object String]");
        });
      }).call(this);
    },

    'Array some': function(it) {
      var actual, expected, numberOfRuns;

      it = beforeEach(it, function() {
        expected = {0:2, 3:true };
        actual = {};
        numberOfRuns = 0;
      });

//      it('should pass the correct values along to the callback', function() {
//        var callback = createSpy('callback');
//        var array = ['1'];
//        array.some(callback);
//        expect(callback).toHaveBeenCalledWith('1', 0, array);
//      });
      it('should not affect elements added to the array after it has begun', function() {
        var arr = [1,2,3],
            i = 0;
        arr.some(function(a) {
          i++;
          arr.push(a+3);
          return i > 3;
        });
        expect(arr).to.eql([1,2,3,4,5,6]);
        expect(i).to.be(3);
      });
      it('should set the right context when given none', function() {
        var context;
        [1].some(function() {context = this;});
        expect(context).to.be(function() {return this}.call());
      });

      it('should return false if it runs to the end', function() {
        actual = testSubject.some(function() {});
        expect(actual).to.not.be.ok();
      });
      it('should return true if it is stopped somewhere', function() {
        actual = testSubject.some(function() { return true; });
        expect(actual).to.be.ok();
      });
      it('should return false if there are no elements', function() {
        actual = [].some(function() { return true; });
        expect(actual).to.not.be.ok();
      });

      it('should stop after 2 elements', function() {
        testSubject.some(function(obj, index) {
          actual[index] = obj;
          numberOfRuns += 1;
          if (numberOfRuns == 2) {
            return true;
          }
          return false;
        });
        expect(actual).to.eql(expected);
      });
      it('should stop after 2 elements using a context', function() {
        var o = { a: actual };
        testSubject.some(function(obj, index) {
          this.a[index] = obj;
          numberOfRuns += 1;
          if (numberOfRuns == 2) {
            return true;
          }
          return false;
        }, o);
        expect(actual).to.eql(expected);
      });

      it('should stop after 2 elements in an array-like object', function() {
        var ts = createArrayLikeFromArray(testSubject);
        Array.prototype.some.call(ts, function(obj, index) {
          actual[index] = obj;
          numberOfRuns += 1;
          if (numberOfRuns == 2) {
            return true;
          }
          return false;
        });
        expect(actual).to.eql(expected);
      });
      it('should stop after 2 elements in an array-like object using a context', function() {
        var ts = createArrayLikeFromArray(testSubject);
        var o = { a: actual };
        Array.prototype.some.call(ts, function(obj, index) {
          this.a[index] = obj;
          numberOfRuns += 1;
          if (numberOfRuns == 2) {
            return true;
          }
          return false;
        }, o);
        expect(actual).to.eql(expected);
      });
    },

    'Array every': function(it) {
      var actual, expected, numberOfRuns;

      it = beforeEach(it, function() {
        expected = {0:2, 3:true };
        actual = {};
        numberOfRuns = 0;
      });

//      it('should pass the correct values along to the callback', function() {
//        var callback = createSpy('callback');
//        var array = ['1'];
//        array.every(callback);
//        expect(callback).toHaveBeenCalledWith('1', 0, array);
//      });
      it('should not affect elements added to the array after it has begun', function() {
        var arr = [1,2,3],
            i = 0;
        arr.every(function(a) {
          i++;
          arr.push(a+3);
          return i <= 3;
        });
        expect(arr).to.eql([1,2,3,4,5,6]);
        expect(i).to.be(3);
      });
      it('should set the right context when given none', function() {
        var context;
        [1].every(function() {context = this;});
        expect(context).to.be(function() {return this}.call());
      });

      it('should return true if the array is empty', function() {
        actual = [].every(function() { return true; });
        expect(actual).to.be.ok();

        actual = [].every(function() { return false; });
        expect(actual).to.be.ok();
      });
      it('should return true if it runs to the end', function() {
        actual = [1,2,3].every(function() { return true; });
        expect(actual).to.be.ok();
      });
      it('should return false if it is stopped before the end', function() {
        actual = [1,2,3].every(function() { return false; });
        expect(actual).to.not.be.ok();
      });

      it('should return after 2 elements', function() {
        testSubject.every(function(obj, index) {
          actual[index] = obj;
          numberOfRuns += 1;
          if (numberOfRuns == 2) {
            return false;
          }
          return true;
        });
        expect(actual).to.eql(expected);
      });
      it('should stop after 2 elements using a context', function() {
        var o = { a: actual };
        testSubject.every(function(obj, index) {
          this.a[index] = obj;
          numberOfRuns += 1;
          if (numberOfRuns == 2) {
            return false;
          }
          return true;
        }, o);
        expect(actual).to.eql(expected);
      });

      it('should stop after 2 elements in an array-like object', function() {
        var ts = createArrayLikeFromArray(testSubject);
        Array.prototype.every.call(ts, function(obj, index) {
          actual[index] = obj;
          numberOfRuns += 1;
          if (numberOfRuns == 2) {
            return false;
          }
          return true;
        });
        expect(actual).to.eql(expected);
      });
      it('should stop after 2 elements in an array-like object using a context', function() {
        var ts = createArrayLikeFromArray(testSubject);
        var o = { a: actual };
        Array.prototype.every.call(ts, function(obj, index) {
          this.a[index] = obj;
          numberOfRuns += 1;
          if (numberOfRuns == 2) {
            return false;
          }
          return true;
        }, o);
        expect(actual).to.eql(expected);
      });
    },

    'Array indexOf': function(it) {
      "use strict";
      var actual, expected, testSubject;

      it = beforeEach(it, function() {
        testSubject = [2, 3, undefined, true, 'hej', null, 2, false, 0];
        //note: for some reason (2 in testSubject) is false
        testSubject[2] = undefined;
        delete testSubject[1];
      });

      it('should find the element', function() {
        expected = 4;
        actual = testSubject.indexOf('hej');
        expect(actual).to.be(expected);
      });
      it('should not find the element', function() {
        expected = -1;
        actual = testSubject.indexOf('mus');
        expect(actual).to.be(expected);
      });
      it('should find undefined as well', function() {
        expected = -1;
        actual = testSubject.indexOf(undefined);
        expect(actual).not.to.be(expected);
      });
      it('should skip unset indexes', function() {
        expected = 2;
        actual = testSubject.indexOf(undefined);
        expect(actual).to.be(expected);
      });
      it('should use a strict test', function() {
        actual = testSubject.indexOf(null);
        expect(actual).to.be(5);

        actual = testSubject.indexOf('2');
        expect(actual).to.be(-1);
      });
      it('should skip the first if fromIndex is set', function() {
        expect(testSubject.indexOf(2, 2)).to.be(6);
        expect(testSubject.indexOf(2, 0)).to.be(0);
        expect(testSubject.indexOf(2, 6)).to.be(6);
      });
      it('should work with negative fromIndex', function() {
        expect(testSubject.indexOf(2, -3)).to.be(6);
        expect(testSubject.indexOf(2, -9)).to.be(0);
      });
      it('should work with fromIndex being greater than the length', function() {
        expect(testSubject.indexOf(0, 20)).to.be(-1);
      });
      it('should work with fromIndex being negative and greater than the length', function() {
        expect(testSubject.indexOf('hej', -20)).to.be(4);
      });

    },

    'Array indexOf (array-like)': function(it) {
      "use strict";
      var actual, expected, testSubject;

      it = beforeEach(it, function() {
        testSubject = [2, 3, undefined, true, 'hej', null, 2, false, 0];
        //note: for some reason (2 in testSubject) is false
        testSubject[2] = undefined;
        delete testSubject[1];
      });

      var indexOf = Array.prototype.indexOf,
          testAL;
      it = beforeEach(it, function() {
        testAL = {};
        testSubject = [2, 3, undefined, true, 'hej', null, 2, false, 0];
        //note: for some reason (2 in testSubject) is false
        testSubject[2] = undefined;
        testSubject.forEach(function (o,i) {
          testAL[i] = o;
        });
        testAL.length = testSubject.length;
      });
      it('should find the element (array-like)', function() {
        expected = 4;
        actual = indexOf.call(testAL, 'hej');
        expect(actual).to.be(expected);
      });
      it('should not find the element (array-like)', function() {
        expected = -1;
        actual = indexOf.call(testAL, 'mus');
        expect(actual).to.be(expected);
      });
      it('should find undefined as well (array-like)', function() {
        expected = -1;
        actual = indexOf.call(testAL, undefined);
        expect(actual).not.to.be(expected);
      });
      it('should skip unset indexes (array-like)', function() {
        expected = 2;
        actual = indexOf.call(testAL, undefined);
        expect(actual).to.be(expected);
      });
      it('should use a strict test (array-like)', function() {
        actual = Array.prototype.indexOf.call(testAL, null);
        expect(actual).to.be(5);

        actual = Array.prototype.indexOf.call(testAL, '2');
        expect(actual).to.be(-1);
      });
      it('should skip the first if fromIndex is set (array-like)', function() {
        expect(indexOf.call(testAL, 2, 2)).to.be(6);
        expect(indexOf.call(testAL, 2, 0)).to.be(0);
        expect(indexOf.call(testAL, 2, 6)).to.be(6);
      });
      it('should work with negative fromIndex (array-like)', function() {
        expect(indexOf.call(testAL, 2, -3)).to.be(6);
        expect(indexOf.call(testAL, 2, -9)).to.be(0);
      });
      it('should work with fromIndex being greater than the length (array-like)', function() {
        expect(indexOf.call(testAL, 0, 20)).to.be(-1);
      });
      it('should work with fromIndex being negative and greater than the length (array-like)', function() {
        expect(indexOf.call(testAL, 'hej', -20)).to.be(4);
      });
    },

    'Array lastIndexOf': function(it) {
      "use strict";
      var actual, expected, testSubject, testAL;

      it = beforeEach(it, function() {
        testSubject = [2, 3, undefined, true, 'hej', null, 2, 3, false, 0];
        //note: for some reason (2 in testSubject) is false
        testSubject[2] = undefined;
        delete testSubject[1];
        delete testSubject[7];
      });

      it('should find the element', function() {
        expected = 4;
        actual = testSubject.lastIndexOf('hej');
        expect(actual).to.be(expected);
      });
      it('should not find the element', function() {
        expected = -1;
        actual = testSubject.lastIndexOf('mus');
        expect(actual).to.be(expected);
      });
      it('should find undefined as well', function() {
        expected = -1;
        actual = testSubject.lastIndexOf(undefined);
        expect(actual).not.to.be(expected);
      });
      it('should skip unset indexes', function() {
        expected = 2;
        actual = testSubject.lastIndexOf(undefined);
        expect(actual).to.be(expected);
      });
      it('should use a strict test', function() {
        actual = testSubject.lastIndexOf(null);
        expect(actual).to.be(5);

        actual = testSubject.lastIndexOf('2');
        expect(actual).to.be(-1);
      });
      it('should skip the first if fromIndex is set', function() {
        expect(testSubject.lastIndexOf(2, 2)).to.be(0);
        expect(testSubject.lastIndexOf(2, 0)).to.be(0);
        expect(testSubject.lastIndexOf(2, 6)).to.be(6);
      });
      it('should work with negative fromIndex', function() {
        expect(testSubject.lastIndexOf(2, -3)).to.be(6);
        expect(testSubject.lastIndexOf(2, -9)).to.be(0);
      });
      it('should work with fromIndex being greater than the length', function() {
        expect(testSubject.lastIndexOf(2, 20)).to.be(6);
      });
      it('should work with fromIndex being negative and greater than the length', function() {
        expect(testSubject.lastIndexOf(2, -20)).to.be(-1);
      });
    },

    'Array lastIndexOf (array-like)': function(it) {
      "use strict";
      var actual, expected, testSubject, testAL;
      var lastIndexOf = Array.prototype.lastIndexOf, testAL;

      it = beforeEach(it, function() {
        testSubject = [2, 3, undefined, true, 'hej', null, 2, 3, false, 0];
        //note: for some reason (2 in testSubject) is false
        testSubject[2] = undefined;
        delete testSubject[1];
        delete testSubject[7];
        testAL = {};
        testSubject.forEach(function (o,i) {
          testAL[i] = o;
        });
        testAL.length = testSubject.length;
      });

      it('should find the element (array-like)', function() {
        expected = 4;
        actual = lastIndexOf.call(testAL, 'hej');
        expect(actual).to.be(expected);
      });
      it('should not find the element (array-like)', function() {
        expected = -1;
        actual = lastIndexOf.call(testAL, 'mus');
        expect(actual).to.be(expected);
      });
      it('should find undefined as well (array-like)', function() {
        expected = -1;
        actual = lastIndexOf.call(testAL, undefined);
        expect(actual).not.to.be(expected);
      });
      it('should skip unset indexes (array-like)', function() {
        expected = 2;
        actual = lastIndexOf.call(testAL, undefined);
        expect(actual).to.be(expected);
      });
      it('should use a strict test (array-like)', function() {
        actual = lastIndexOf.call(testAL, null);
        expect(actual).to.be(5);

        actual = lastIndexOf.call(testAL, '2');
        expect(actual).to.be(-1);
      });
      it('should skip the first if fromIndex is set', function() {
        expect(lastIndexOf.call(testAL, 2, 2)).to.be(0);
        expect(lastIndexOf.call(testAL, 2, 0)).to.be(0);
        expect(lastIndexOf.call(testAL, 2, 6)).to.be(6);
      });
      it('should work with negative fromIndex', function() {
        expect(lastIndexOf.call(testAL, 2, -3)).to.be(6);
        expect(lastIndexOf.call(testAL, 2, -9)).to.be(0);
      });
      it('should work with fromIndex being greater than the length', function() {
        expect(lastIndexOf.call(testAL, 2, 20)).to.be(6);
      });
      it('should work with fromIndex being negative and greater than the length', function() {
        expect(lastIndexOf.call(testAL, 2, -20)).to.be(-1);
      });
    },

    'Array filter': function(it) {
      var filteredArray;
      var callback = function callback(o, i, arr) {
        return (i != 3 && i != 5);
      };

      it = beforeEach(it, function() {
        testSubject = [2, 3, undefined, true, 'hej', 3, null, false, 0];
        delete testSubject[1];
        filteredArray = [2, undefined, 'hej', null, false, 0];
      });
//      it('should call the callback with the proper arguments', function() {
//        var callback = createSpy('callback'),
//            arr = ['1'];
//        arr.filter(callback);
//        expect(callback).toHaveBeenCalledWith('1', 0, arr);
//      });
      it('should not affect elements added to the array after it has begun', function() {
        var arr = [1,2,3],
            i = 0;
        arr.filter(function(a) {
          i++;
          if (i <= 4) {
            arr.push(a+3);
          }
          return true;
        });
        expect(arr).to.eql([1,2,3,4,5,6]);
        expect(i).to.be(3);
      });
      it('should skip non-set values', function() {
        var passedValues = {};
        testSubject = [1,2,3,4];
        delete testSubject[1];
        testSubject.filter(function(o, i) {
          passedValues[i] = o;
          return true;
        });
        expect(passedValues).to.eql(testSubject);
      });
      it('should pass the right context to the filter', function() {
        var passedValues = {};
        testSubject = [1,2,3,4];
        delete testSubject[1];
        testSubject.filter(function(o, i) {
          this[i] = o;
          return true;
        }, passedValues);
        expect(passedValues).to.eql(testSubject);
      });
      it('should set the right context when given none', function() {
        var context;
        [1].filter(function() {context = this;});
        expect(context).to.be(function() {return this}.call());
      });
// note: this throws: expected [ 2, 'hej', null, false, 0 ] to sort of equal [ 2, , 'hej', null, false, 0 ]
//      it('should remove only the values for which the callback returns false', function() {
//        var result = testSubject.filter(callback);
//        expect(result).to.eql(filteredArray);
//      });
      it('should leave the original array untouched', function() {
        var copy = testSubject.slice();
        testSubject.filter(callback);
        expect(testSubject).to.eql(copy);
      });
      it('should not be affected by same-index mutation', function () {
        var results = [1, 2, 3]
            .filter(function (value, index, array) {
              array[index] = 'a';
              return true;
            });
        expect(results).to.eql([1, 2, 3]);
      });
    },

    'Array filter (array-like)': function(it) {
      var filteredArray;
      var callback = function callback(o, i, arr) {
        return (i != 3 && i != 5);
      };

      it = beforeEach(it, function() {
        testSubject = [2, 3, undefined, true, 'hej', 3, null, false, 0];
        delete testSubject[1];
        filteredArray = [2, undefined, 'hej', null, false, 0];
        testSubject = createArrayLikeFromArray(testSubject);
      });

//      it('should call the callback with the proper arguments', function() {
//        var callback = createSpy('callback'),
//            arr = createArrayLikeFromArray(['1']);
//        Array.prototype.filter.call(arr, callback);
//        expect(callback).toHaveBeenCalledWith('1', 0, arr);
//      });
      it('should not affect elements added to the array after it has begun', function() {
        var arr = createArrayLikeFromArray([1,2,3]),
            i = 0;
        Array.prototype.filter.call(arr, function(a) {
          i++;
          if (i <= 4) {
            arr[i+2] = a+3;
          }
          return true;
        });
        delete arr.length;
        expect(arr).to.eql([1,2,3,4,5,6]);
        expect(i).to.be(3);
      });
      it('should skip non-set values', function() {
        var passedValues = {};
        testSubject = createArrayLikeFromArray([1,2,3,4]);
        delete testSubject[1];
        Array.prototype.filter.call(testSubject, function(o, i) {
          passedValues[i] = o;
          return true;
        });
        delete testSubject.length;
        expect(passedValues).to.eql(testSubject);
      });
      it('should set the right context when given none', function() {
        var context;
        Array.prototype.filter.call(createArrayLikeFromArray([1]), function() {context = this;}, undefined);
        expect(context).to.be(function() {return this}.call());
      });
      it('should pass the right context to the filter', function() {
        var passedValues = {};
        testSubject = createArrayLikeFromArray([1,2,3,4]);
        delete testSubject[1];
        Array.prototype.filter.call(testSubject, function(o, i) {
          this[i] = o;
          return true;
        }, passedValues);
        delete testSubject.length;
        expect(passedValues).to.eql(testSubject);
      });
//      it('should remove only the values for which the callback returns false', function() {
//        var result = Array.prototype.filter.call(testSubject, callback);
//        expect(result).to.eql(filteredArray);
//      });
      it('should leave the original array untouched', function() {
        var copy = createArrayLikeFromArray(testSubject);
        Array.prototype.filter.call(testSubject, callback);

        expect(testSubject).to.eql(copy);
      });
    },

    'Array map': function(it) {
      var callback;
      it = beforeEach(it, function() {
        var i = 0;
        callback = function() {
          return i++;
        };
      });

//      it('should call callback with the right parameters', function() {
//        var callback = createSpy('callback'),
//            array = [1];
//        array.map(callback);
//        expect(callback).toHaveBeenCalledWith(1, 0, array);
//      });
      it('should set the context correctly', function() {
        var context = {};
        testSubject.map(function(o,i) {
          this[i] = o;
        }, context);
        expect(context).to.eql(testSubject);
      });
      it('should set the right context when given none', function() {
        var context;
        [1].map(function() {context = this;});
        expect(context).to.be(function() {return this}.call());
      });
      it('should not change the array it is called on', function() {
        var copy = testSubject.slice();
        testSubject.map(callback);
        expect(testSubject).to.eql(copy);
      });
      it('should only run for the number of objects in the array when it started', function() {
        var arr = [1,2,3],
            i = 0;
        arr.map(function(o) {
          arr.push(o+3);
          i++;
          return o;
        });
        expect(arr).to.eql([1,2,3,4,5,6]);
        expect(i).to.be(3);
      });
//      it('should properly translate the values as according to the callback', function() {
//        var result = testSubject.map(callback),
//            expected = [0,0,1,2,3,4,5,6];
//        delete expected[1];
//        expect(result).to.eql(expected);
//      });
      it('should skip non-existing values', function() {
        var array = [1,2,3,4],
            i = 0;
        delete array[2];
        array.map(function() {
          i++;
        });
        expect(i).to.be(3);
      });
    },

    'Array map (array-like)': function(it) {
      var callback;
      it = beforeEach(it, function() {
        var i = 0;
        callback = function() {
          return i++;
        };
      });

      it = beforeEach(it, function() {
        testSubject = createArrayLikeFromArray(testSubject);
      });
//      it('should call callback with the right parameters', function() {
//        var callback = createSpy('callback'),
//            array = createArrayLikeFromArray([1]);
//        Array.prototype.map.call(array, callback);
//        expect(callback).toHaveBeenCalledWith(1, 0, array);
//      });
      it('should set the context correctly', function() {
        var context = {};
        Array.prototype.map.call(testSubject, function(o,i) {
          this[i] = o;
        }, context);
        delete testSubject.length;
        expect(context).to.eql(testSubject);
      });
      it('should set the right context when given none', function() {
        var context;
        Array.prototype.map.call(createArrayLikeFromArray([1]), function() {context = this;});
        expect(context).to.be(function() {return this}.call());
      });
      it('should not change the array it is called on', function() {
        var copy = createArrayLikeFromArray(testSubject);
        Array.prototype.map.call(testSubject, callback);
        expect(testSubject).to.eql(copy);
      });
      it('should only run for the number of objects in the array when it started', function() {
        var arr = createArrayLikeFromArray([1,2,3]),
            i = 0;
        Array.prototype.map.call(arr, function(o) {
          Array.prototype.push.call(arr, o+3);
          i++;
          return o;
        });
        delete arr.length;
        expect(arr).to.eql([1,2,3,4,5,6]);
        expect(i).to.be(3);
      });
//      it('should properly translate the values as according to the callback', function() {
//        var result = Array.prototype.map.call(testSubject, callback),
//            expected = [0,0,1,2,3,4,5,6];
//        delete expected[1];
//        expect(result).to.eql(expected);
//      });
      it('should skip non-existing values', function() {
        var array = createArrayLikeFromArray([1,2,3,4]),
            i = 0;
        delete array[2];
        Array.prototype.map.call(array, function() {
          i++;
        });
        expect(i).to.be(3);
      });
    },

    'Array reduce': function(it) {
      it = beforeEach(it, function() {
        testSubject = [1,2,3];
      });

//      it('should pass the correct arguments to the callback', function() {
//        var spy = createSpy().andReturn(0);
//        testSubject.reduce(spy);
//        expect(spy.calls[0].args).to.eql([1, 2, 1, testSubject]);
//      });
//      it('should start with the right initialValue', function() {
//        var spy = createSpy().andReturn(0);
//        testSubject.reduce(spy, 0);
//        expect(spy.calls[0].args).to.eql([0, 1, 0, testSubject]);
//      });
      it('should not affect elements added to the array after it has begun', function() {
        var arr = [1,2,3],
            i = 0;
        arr.reduce(function(a, b) {
          i++;
          if (i <= 4) {
            arr.push(a+3);
          };
          return b;
        });
        expect(arr).to.eql([1,2,3,4,5]);
        expect(i).to.be(2);
      });
//      it('should work as expected for empty arrays', function() {
//        var spy = createSpy();
//        expect(function() {
//          [].reduce(spy);
//        }).to.throwError();
//        expect(spy).not.toHaveBeenCalled();
//      });
      it('should throw correctly if no callback is given', function() {
        expect(function() {
          testSubject.reduce();
        }).to.throwError();
      });
      it('should return the expected result', function() {
        expect(testSubject.reduce(function(a,b) {
          return (a||'').toString()+(b||'').toString();
        })).to.be(testSubject.join(''));
      });
      it('should not directly affect the passed array', function() {
        var copy = testSubject.slice();
        testSubject.reduce(function(a,b) {
          return a+b;
        });
        expect(testSubject).to.eql(copy);
      });
      it('should skip non-set values', function() {
        delete testSubject[1];
        var visited = {};
        testSubject.reduce(function(a,b) {
          if (a)
            visited[a] = true;
          if (b)
            visited[b] = true;
          return 0;
        });

        expect(visited).to.eql({ '1': true, '3': true });
      });
      it('should have the right length', function() {
        expect(testSubject.reduce.length).to.be(1);
      });
    },

    'Array reduce (array-like)': function(it) {
      it = beforeEach(it, function() {
        testSubject = [1,2,3];
        testSubject = createArrayLikeFromArray(testSubject);
        testSubject.reduce = Array.prototype.reduce;
      });
//      it('should pass the correct arguments to the callback', function() {
//        var spy = createSpy().andReturn(0);
//        testSubject.reduce(spy);
//        expect(spy.calls[0].args).to.eql([1, 2, 1, testSubject]);
//      });
//      it('should start with the right initialValue', function() {
//        var spy = createSpy().andReturn(0);
//        testSubject.reduce(spy, 0);
//        expect(spy.calls[0].args).to.eql([0, 1, 0, testSubject]);
//      });
      it('should not affect elements added to the array after it has begun', function() {
        var arr = createArrayLikeFromArray([1,2,3]),
            i = 0;
        Array.prototype.reduce.call(arr, function(a, b) {
          i++;
          if (i <= 4) {
            arr[i+2] = a+3;
          };
          return b;
        });
        expect(arr).to.eql({
          0: 1,
          1: 2,
          2: 3,
          3: 4,
          4: 5,
          length: 3
        });
        expect(i).to.be(2);
      });
//      it('should work as expected for empty arrays', function() {
//        var spy = createSpy();
//        expect(function() {
//          Array.prototype.reduce.call({length: 0}, spy);
//        }).to.throwError();
//        expect(spy).not.toHaveBeenCalled();
//      });
      it('should throw correctly if no callback is given', function() {
        expect(function() {
          testSubject.reduce();
        }).to.throwError();
      });
      it('should return the expected result', function() {
        expect(testSubject.reduce(function(a,b) {
          return (a||'').toString()+(b||'').toString();
        })).to.be('123');
      });
      it('should not directly affect the passed array', function() {
        var copy = createArrayLikeFromArray(testSubject);
        testSubject.reduce(function(a,b) {
          return a+b;
        });
        delete(testSubject.reduce);
        expect(testSubject).to.eql(copy);
      });
      it('should skip non-set values', function() {
        delete testSubject[1];
        var visited = {};
        testSubject.reduce(function(a,b) {
          if (a)
            visited[a] = true;
          if (b)
            visited[b] = true;
          return 0;
        });

        expect(visited).to.eql({ '1': true, '3': true });
      });
      it('should have the right length', function() {
        expect(testSubject.reduce.length).to.be(1);
      });
    },

    'Array reduceRight': function(it) {
      it = beforeEach(it, function() {
        testSubject = [1,2,3];
      });

//      it('should pass the correct arguments to the callback', function() {
//        var spy = createSpy().andReturn(0);
//        testSubject.reduceRight(spy);
//        expect(spy.calls[0].args).to.eql([3, 2, 1, testSubject]);
//      });
//      it('should start with the right initialValue', function() {
//        var spy = createSpy().andReturn(0);
//        testSubject.reduceRight(spy, 0);
//        expect(spy.calls[0].args).to.eql([0, 3, 2, testSubject]);
//      });
      it('should not affect elements added to the array after it has begun', function() {
        var arr = [1,2,3],
            i = 0;
        arr.reduceRight(function(a, b) {
          i++;
          if (i <= 4) {
            arr.push(a+3);
          };
          return b;
        });
        expect(arr).to.eql([1,2,3,6,5]);
        expect(i).to.be(2);
      });
//      it('should work as expected for empty arrays', function() {
//        var spy = createSpy();
//        expect(function() {
//          [].reduceRight(spy);
//        }).to.throwError();
//        expect(spy).not.toHaveBeenCalled();
//      });
//      it('should work as expected for empty arrays with an initial value', function() {
//        var spy = createSpy(),
//            result;
      //
//        result = [].reduceRight(spy, '');
//        expect(spy).not.toHaveBeenCalled();
//        expect(result).to.be('');
//      });
      it('should throw correctly if no callback is given', function() {
        expect(function() {
          testSubject.reduceRight();
        }).to.throwError();
      });
      it('should return the expected result', function() {
        expect(testSubject.reduceRight(function(a,b) {
          return (a||'').toString()+(b||'').toString();
        })).to.be('321');
      });
      it('should not directly affect the passed array', function() {
        var copy = testSubject.slice();
        testSubject.reduceRight(function(a,b) {
          return a+b;
        });
        expect(testSubject).to.eql(copy);
      });
      it('should skip non-set values', function() {
        delete testSubject[1];
        var visited = {};
        testSubject.reduceRight(function(a,b) {
          if (a)
            visited[a] = true;
          if (b)
            visited[b] = true;
          return 0;
        });

        expect(visited).to.eql({ '1': true, '3': true });
      });
      it('should have the right length', function() {
        expect(testSubject.reduceRight.length).to.be(1);
      });
    },

    'Array reduceRight (array-like)': function(it) {
      it = beforeEach(it, function() {
        testSubject = [1,2,3];
        testSubject = createArrayLikeFromArray(testSubject);
        testSubject.reduceRight = Array.prototype.reduceRight;
      });
//      it('should pass the correct arguments to the callback', function() {
//        var spy = createSpy().andReturn(0);
//        testSubject.reduceRight(spy);
//        expect(spy.calls[0].args).to.eql([3, 2, 1, testSubject]);
//      });
//      it('should start with the right initialValue', function() {
//        var spy = createSpy().andReturn(0);
//        testSubject.reduceRight(spy, 0);
//        expect(spy.calls[0].args).to.eql([0, 3, 2, testSubject]);
//      });
      it('should not affect elements added to the array after it has begun', function() {
        var arr = createArrayLikeFromArray([1,2,3]),
            i = 0;
        Array.prototype.reduceRight.call(arr, function(a, b) {
          i++;
          if (i <= 4) {
            arr[i+2] = a+3;
          };
          return b;
        });
        expect(arr).to.eql({
          0: 1,
          1: 2,
          2: 3,
          3: 6,
          4: 5,
          length: 3 // does not get updated on property assignment
        });
        expect(i).to.be(2);
      });
//      it('should work as expected for empty arrays', function() {
//        var spy = createSpy();
//        expect(function() {
//          Array.prototype.reduceRight.call({length:0}, spy);
//        }).to.throwError();
//        expect(spy).not.toHaveBeenCalled();
//      });
      it('should throw correctly if no callback is given', function() {
        expect(function() {
          testSubject.reduceRight();
        }).to.throwError();
      });
      it('should return the expected result', function() {
        expect(testSubject.reduceRight(function(a,b) {
          return (a||'').toString()+(b||'').toString();
        })).to.be('321');
      });
      it('should not directly affect the passed array', function() {
        var copy = createArrayLikeFromArray(testSubject);
        testSubject.reduceRight(function(a,b) {
          return a+b;
        });
        delete(testSubject.reduceRight);
        expect(testSubject).to.eql(copy);
      });
      it('should skip non-set values', function() {
        delete testSubject[1];
        var visited = {};
        testSubject.reduceRight(function(a,b) {
          if (a)
            visited[a] = true;
          if (b)
            visited[b] = true;
          return 0;
        });

        expect(visited).to.eql({ '1': true, '3': true });
      });
      it('should have the right length', function() {
        expect(testSubject.reduceRight.length).to.be(1);
      });
    },

    'Array.isArray': function(it) {
      it('should work for Array', function () {
        var ret = Array.isArray([]);

        expect(ret).to.be(true);
      });

      it('should fail for other objects', function () {
        var objects = [
          "someString",
          true,
          false,
          42,
          0,
          {},
          null,
          /foo/,
          arguments
        ];

        objects.forEach(function (v) {
          expect(Array.isArray(v)).to.be(false);
        });
      });
    },

    'Array unshift': function (it) {
      it('should return length', function () {
        expect([].unshift(0)).to.be(1);
      });
    },

    'Array splice': function(it) {
      var b = ["b"],
          a = [1, "a", b],
          test;

      var makeArray = function(l, prefix) {
        prefix = prefix || "";
        var a = [];
        while (l--) {
          a.unshift(prefix + Array(l + 1).join(" ") + l)
        }
        return a
      };

      it = beforeEach(it, function() {
        test = a.slice(0);
      });

      it('basic implementation test 1', function () {
        expect(test.splice(0)).to.eql(a);
      });
      it('basic implementation test 2', function () {
        test.splice(0, 2);
        expect(test).to.eql([b]);
      });

//      it('should return right result 1', function () {
//        expect((function() {
//          var array = [];
//
//          array.splice(0, 0, 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20);
//          array.splice(1, 0, "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "F13", "F14", "F15", "F16", "F17", "F18", "F19", "F20", "F21","F22", "F23", "F24", "F25", "F26");
//          array.splice(5, 0, "XXX");
//
//          return array.join("|");
//        }())).to.be("1|F1|F2|F3|F4|XXX|F5|F6|F7|F8|F9|F10|F11|F12|F13|F14|F15|F16|F17|F18|F19|F20|F21|F22|F23|F24|F25|F26|2|3|4|5|6|7|8|9|10|11|12|13|14|15|16|17|18|19|20");
//      });

//      it('should return right result 2', function () {
//        expect((function() {
//          var array = makeArray(6);
//
//          array.splice(array.length - 1, 1, "");
//          array.splice(0, 1, 1,2,3,4);
//          array.splice(0, 0, 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20, 21, 22, 23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45);
//
//          array.splice(4, 0, "99999999999999");
//          return array.join("|");
//        }())).to.be("1|2|3|4|99999999999999|5|6|7|8|9|10|11|12|13|14|15|16|17|18|19|20|21|22|23|24|25|26|27|28|29|30|31|32|33|34|35|36|37|38|39|40|41|42|43|44|45|1|2|3|4| 1|  2|   3|  4|");
//      });

//      it('should return right result 3', function () {
//        expect((function() {
//          var array = [1,2,3];
//
//          array.splice(0);
//          array.splice(0, 1, 1,2,3,4,5,6,7,8,9,10);
//          array.splice(1, 1, "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "F13", "F14", "F15", "F16", "F17", "F18", "F19", "F20", "F21","F22", "F23", "F24", "F25", "F26");
//          array.splice(5, 1, "YYY", "XXX");
//          array.splice(0, 1);
//          array.splice(0, 2);
//          array.pop();
//          array.push.apply(array, makeArray(10, "-"));
//          array.splice(array.length - 2, 10);
//          array.splice();
//          array.splice(1, 1, 1,2,3,4,5,6,7,8,9,10,1,2,3,4,5,6,7,8,9);
//          array.splice(1, 1, "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "F13", "F14", "F15", "F16", "F17", "F18", "F19", "F20", "F21","F22", "F23", "F24", "F25", "F26",1,23,4,5,6,7,8);
//          array.splice(30, 10);
//          array.splice(30, 1);
//          array.splice(30, 0);
//          array.splice(2, 5, 1,2,3,"P", "LLL", "CCC", "YYY", "XXX");
//          array.push(1,2,3,4,5,6);
//          array.splice(1, 6, 1,2,3,4,5,6,7,8,9,4,5,6,7,8,9);
//          array.splice(3, 7);
//          array.unshift(7,8,9,10,11);
//          array.pop();
//          array.splice(5, 2);
//          array.pop();
//          array.unshift.apply(array, makeArray(8, "~"));
//          array.pop();
//          array.splice(3, 1, "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "F13", "F14", "F15", "F16", "F17", "F18", "F19", "F20", "F21","F22", "F23", "F24", "F25", "F26",1,23,4,5,6,7,8);
//          array.splice(4, 5, "P", "LLL", "CCC", "YYY", "XXX");
//
//          return array.join("|");
//        }())).to.be("~0|~ 1|~  2|F1|P|LLL|CCC|YYY|XXX|F7|F8|F9|F10|F11|F12|F13|F14|F15|F16|F17|F18|F19|F20|F21|F22|F23|F24|F25|F26|1|23|4|5|6|7|8|~  4|~   5|~    6|~     7|7|8|9|10|11|2|4|5|6|7|8|9|CCC|YYY|XXX|F7|F8|F9|F10|F11|F12|F13|F14|F15|F16|F17|F18|F19|F20|F21|F22|F23|F24|F25|F26|1|23|4|9|10|1|2|3|4|5|6|7|8|9|YYY|XXX|F6|F7|F8|F9|F10|F11|F12|F13|F14|F15|F16|F17|F18|F19|F20|F21|F22|F23|F24|F25|F26|3|4|5|6|7|8|9|-0|- 1|-  2|-   3|-  4|-   5|-    6|-     7|1|2|3");
//      });


      it('should do nothing if method called with no arguments', function () {
        expect(test.splice()).to.eql([]);
        expect(test).to.eql(a);
      });

      it('should set first argument to 0 if first argument is set but undefined', function () {
        var test2 = test.slice(0);
        expect(test.splice(void 0, 2)).to.eql(test2.splice(0, 2));
        expect(test).to.eql(test2);
      });

      it('should deleted and return all items after "start" when second argument is undefined', function () {
        expect(test.splice(0)).to.eql(a);
        expect(test).to.eql([]);
      });
      it('should deleted and return all items after "start" when second argument is undefined', function () {
        expect(test.splice(2)).to.eql([b]);
        expect(test).to.eql([1, "a"]);
      });
      it('runshould have the right length', function () {
        expect(test.splice.length).to.be(2);
      });
    }
  });

});