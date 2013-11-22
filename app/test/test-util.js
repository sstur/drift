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
      var original = {date: new Date(), number: Math.random(), undefined: undefined};
      var clone = util.clone(original);
      expect(clone).to.not.be(original);
      //expect(clone).to.eql(original);
      expect(clone.date).to.not.be(original.date);
      expect(clone.date.valueOf()).to.be(original.date.valueOf());
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