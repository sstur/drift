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

  app.addTestSuite('polyfills-array', {
    //'Object.create(null)': function() {
    //  var o = Object.create(null);
    //  expect(o.toString).to.be(null);
    //},
    //'Object.create()': function() {
    //  var a = {type: 1};
    //  var b = Object.create(a);
    //  expect(b.type).to.be(1);
    //  b.type = 2;
    //  expect(b.type).to.be(2);
    //  delete b.type;
    //  expect(b.type).to.be(1);
    //},
    beforeEach: function() {
      testSubject = [2, 3, undefined, true, 'hej', null, false, 0];
      delete testSubject[1];
    },

    'Array: forEach': function(it) {
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

    'Array: some': function(it) {
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

    'Array: every': function(it) {
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

    'Array: indexOf': function(it) {
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

    'Array: indexOf (array-like)': function(it) {
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

    'Array: lastIndexOf': function(it) {
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

    'Array: lastIndexOf (array-like)': function(it) {
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

    'Array: filter': function(it) {
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

    'Array: filter (array-like)': function(it) {
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

    'Array: map': function(it) {
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

    'Array: map (array-like)': function(it) {
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

    'Array: reduce': function(it) {
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

    'Array: reduce (array-like)': function(it) {
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

    'Array: reduceRight': function(it) {
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

    'Array: reduceRight (array-like)': function(it) {
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

    'Array: isArray': function(it) {
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

    'Array: unshift': function (it) {
      it('should return length', function () {
        expect([].unshift(0)).to.be(1);
      });
    },

    'Array: splice': function(it) {
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