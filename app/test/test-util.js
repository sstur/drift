/*!
 * todo: date reviver edge cases
 */
/*global app, define */
app.on('ready', function(require) {
  "use strict";

  var util = require('util');
  var expect = require('expect');

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
        'undefined': void 0,
        date: new Date(),
        //buffer: new Buffer('abc'),
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
    },
    'util.propagateEvents': function() {
    },
    'util.pipe': function() {
    },
    'util.getUniqueHex': function() {
    },
    'util.hexBytes': function() {
    },
    'util.parseHeaders': function() {
    },
    'util.parseHeaderValue': function() {
    },
    'util.stripFilename': function() {
    },
    'util.htmlEnc': function() {
    },
    'util.htmlDec': function() {
    },
    'util.stringify': function() {
    },
    'util.parse': function() {
    }
  });

});