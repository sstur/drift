/*global app, define */
define('expect', function(require, exports, module) {

  module.exports = expect;
  expect.Assertion = Assertion;

  expect.version = '0.1.2';

  /**
   * Possible assertion flags.
   */

  var flags = {
    not: ['to', 'be', 'have', 'include', 'only'],
    to: ['be', 'have', 'include', 'only', 'not'],
    only: ['have'],
    have: ['own'],
    be: ['an']
  };

  function expect(obj) {
    return new Assertion(obj);
  }

  /**
   * Constructor
   *
   * @api private
   */

  function Assertion(obj, flag, parent) {
    this.obj = obj;
    this.flags = {};

    if (undefined != parent) {
      this.flags[flag] = true;

      for (var i in parent.flags) {
        if (parent.flags.hasOwnProperty(i)) {
          this.flags[i] = true;
        }
      }
    }

    var $flags = flag ? flags[flag] : keys(flags);
    var self = this;

    if ($flags) {
      for (var i = 0, l = $flags.length; i < l; i++) {
        // avoid recursion
        if (this.flags[$flags[i]]) continue;

        var name = $flags[i];
        var assertion = new Assertion(this.obj, name, this)

        if ('function' == typeof Assertion.prototype[name]) {
          // clone the function, make sure we dont touch the prot reference
          var old = this[name];
          this[name] = function() {
            return old.apply(self, arguments);
          };

          for (var fn in Assertion.prototype) {
            if (Assertion.prototype.hasOwnProperty(fn) && fn != name) {
              this[name][fn] = assertion[fn].bind(assertion);
            }
          }
        } else {
          this[name] = assertion;
        }
      }
    }
  }

  /**
   * Performs an assertion
   *
   * @api private
   */

  Assertion.prototype.assert = function(truth, msg, error, expected) {
    var msg = this.flags.not ? error : msg;
    var ok = this.flags.not ? !truth : truth;
    var err;

    if (!ok) {
      err = new Error(msg.call(this));
      if (arguments.length > 3) {
        err.actual = this.obj;
        err.expected = expected;
        err.showDiff = true;
      }
      throw err;
    }

    this.and = new Assertion(this.obj);
  };

  /**
   * Check if the value is truthy
   *
   * @api public
   */

  Assertion.prototype.ok = function() {
    this.assert(
        !!this.obj
        , function() {
          return 'expected ' + inspect(this.obj) + ' to be truthy'
        }
        , function() {
          return 'expected ' + inspect(this.obj) + ' to be falsy'
        });
  };

  /**
   * Creates an anonymous function which calls fn with arguments.
   *
   * @api public
   */

  Assertion.prototype.withArgs = function() {
    expect(this.obj).to.be.a('function');
    var fn = this.obj;
    var args = Array.prototype.slice.call(arguments);
    return expect(function() {
      fn.apply(null, args);
    });
  };

  /**
   * Assert that the function throws.
   *
   * @param {Function|RegExp} callback, or regexp to match error string against
   * @api public
   */

  Assertion.prototype.throwError = Assertion.prototype.throwException = function(fn) {
    expect(this.obj).to.be.a('function');

    var thrown = false;
    var not = this.flags.not;

    try {
      this.obj();
    } catch (e) {
      if (isRegExp(fn)) {
        var subject = 'string' == typeof e ? e : e.message;
        if (not) {
          expect(subject).to.not.match(fn);
        } else {
          expect(subject).to.match(fn);
        }
      } else if ('function' == typeof fn) {
        fn(e);
      }
      thrown = true;
    }

    if (isRegExp(fn) && not) {
      // in the presence of a matcher, ensure the `not` only applies to
      // the matching.
      this.flags.not = false;
    }

    var name = this.obj.name || 'fn';
    this.assert(
        thrown
        , function() {
          return 'expected ' + name + ' to throw an exception'
        }
        , function() {
          return 'expected ' + name + ' not to throw an exception'
        });
  };

  /**
   * Checks if the array is empty.
   *
   * @api public
   */

  Assertion.prototype.empty = function() {
    var expectation;

    if ('object' == typeof this.obj && null !== this.obj && !isArray(this.obj)) {
      if ('number' == typeof this.obj.length) {
        expectation = !this.obj.length;
      } else {
        expectation = !keys(this.obj).length;
      }
    } else {
      if ('string' != typeof this.obj) {
        expect(this.obj).to.be.an('object');
      }

      expect(this.obj).to.have.property('length');
      expectation = !this.obj.length;
    }

    this.assert(
        expectation
        , function() {
          return 'expected ' + inspect(this.obj) + ' to be empty'
        }
        , function() {
          return 'expected ' + inspect(this.obj) + ' to not be empty'
        });
    return this;
  };

  /**
   * Checks if the obj exactly equals another.
   *
   * @api public
   */

  Assertion.prototype.be = Assertion.prototype.equal = function(obj) {
    this.assert(
        obj === this.obj
        , function() {
          return 'expected ' + inspect(this.obj) + ' to equal ' + inspect(obj)
        }
        , function() {
          return 'expected ' + inspect(this.obj) + ' to not equal ' + inspect(obj)
        });
    return this;
  };

  /**
   * Checks if the obj sortof equals another.
   *
   * @api public
   */

  Assertion.prototype.eql = function(obj) {
    this.assert(
        expect.eql(this.obj, obj)
        , function() {
          return 'expected ' + inspect(this.obj) + ' to sort of equal ' + inspect(obj)
        }
        , function() {
          return 'expected ' + inspect(this.obj) + ' to sort of not equal ' + inspect(obj)
        }
        , obj);
    return this;
  };

  /**
   * Assert within start to finish (inclusive).
   *
   * @param {Number} start
   * @param {Number} finish
   * @api public
   */

  Assertion.prototype.within = function(start, finish) {
    var range = start + '..' + finish;
    this.assert(
        this.obj >= start && this.obj <= finish
        , function() {
          return 'expected ' + inspect(this.obj) + ' to be within ' + range
        }
        , function() {
          return 'expected ' + inspect(this.obj) + ' to not be within ' + range
        });
    return this;
  };

  /**
   * Assert typeof / instance of
   *
   * @api public
   */

  Assertion.prototype.a = Assertion.prototype.an = function(type) {
    if ('string' == typeof type) {
      // proper english in error msg
      var n = /^[aeiou]/.test(type) ? 'n' : '';

      // typeof with support for 'array'
      this.assert(
          'array' == type ? isArray(this.obj) :
              'regexp' == type ? isRegExp(this.obj) :
                  'object' == type
                      ? 'object' == typeof this.obj && null !== this.obj
                      : type == typeof this.obj
          , function() {
            return 'expected ' + inspect(this.obj) + ' to be a' + n + ' ' + type
          }
          , function() {
            return 'expected ' + inspect(this.obj) + ' not to be a' + n + ' ' + type
          });
    } else {
      // instanceof
      var name = type.name || 'supplied constructor';
      this.assert(
          this.obj instanceof type
          , function() {
            return 'expected ' + inspect(this.obj) + ' to be an instance of ' + name
          }
          , function() {
            return 'expected ' + inspect(this.obj) + ' not to be an instance of ' + name
          });
    }

    return this;
  };

  /**
   * Assert numeric value above _n_.
   *
   * @param {Number} n
   * @api public
   */

  Assertion.prototype.greaterThan = Assertion.prototype.above = function(n) {
    this.assert(
        this.obj > n
        , function() {
          return 'expected ' + inspect(this.obj) + ' to be above ' + n
        }
        , function() {
          return 'expected ' + inspect(this.obj) + ' to be below ' + n
        });
    return this;
  };

  /**
   * Assert numeric value below _n_.
   *
   * @param {Number} n
   * @api public
   */

  Assertion.prototype.lessThan = Assertion.prototype.below = function(n) {
    this.assert(
        this.obj < n
        , function() {
          return 'expected ' + inspect(this.obj) + ' to be below ' + n
        }
        , function() {
          return 'expected ' + inspect(this.obj) + ' to be above ' + n
        });
    return this;
  };

  /**
   * Assert string value matches _regexp_.
   *
   * @param {RegExp} regexp
   * @api public
   */

  Assertion.prototype.match = function(regexp) {
    this.assert(
        regexp.exec(this.obj)
        , function() {
          return 'expected ' + inspect(this.obj) + ' to match ' + regexp
        }
        , function() {
          return 'expected ' + inspect(this.obj) + ' not to match ' + regexp
        });
    return this;
  };

  /**
   * Assert property "length" exists and has value of _n_.
   *
   * @param {Number} n
   * @api public
   */

  Assertion.prototype.length = function(n) {
    expect(this.obj).to.have.property('length');
    var len = this.obj.length;
    this.assert(
        n == len
        , function() {
          return 'expected ' + inspect(this.obj) + ' to have a length of ' + n + ' but got ' + len
        }
        , function() {
          return 'expected ' + inspect(this.obj) + ' to not have a length of ' + len
        });
    return this;
  };

  /**
   * Assert property _name_ exists, with optional _val_.
   *
   * @param {String} name
   * @param {Mixed} val
   * @api public
   */

  Assertion.prototype.property = function(name, val) {
    if (this.flags.own) {
      this.assert(
          Object.prototype.hasOwnProperty.call(this.obj, name)
          , function() {
            return 'expected ' + inspect(this.obj) + ' to have own property ' + inspect(name)
          }
          , function() {
            return 'expected ' + inspect(this.obj) + ' to not have own property ' + inspect(name)
          });
      return this;
    }

    if (this.flags.not && undefined !== val) {
      if (undefined === this.obj[name]) {
        throw new Error(inspect(this.obj) + ' has no property ' + inspect(name));
      }
    } else {
      var hasProp;
      try {
        hasProp = name in this.obj
      } catch (e) {
        hasProp = undefined !== this.obj[name]
      }

      this.assert(
          hasProp
          , function() {
            return 'expected ' + inspect(this.obj) + ' to have a property ' + inspect(name)
          }
          , function() {
            return 'expected ' + inspect(this.obj) + ' to not have a property ' + inspect(name)
          });
    }

    if (undefined !== val) {
      this.assert(
          val === this.obj[name]
          , function() {
            return 'expected ' + inspect(this.obj) + ' to have a property ' + inspect(name)
                + ' of ' + inspect(val) + ', but got ' + inspect(this.obj[name])
          }
          , function() {
            return 'expected ' + inspect(this.obj) + ' to not have a property ' + inspect(name)
                + ' of ' + inspect(val)
          });
    }

    this.obj = this.obj[name];
    return this;
  };

  /**
   * Assert that the array contains _obj_ or string contains _obj_.
   *
   * @param {Mixed} obj|string
   * @api public
   */

  Assertion.prototype.string = Assertion.prototype.contain = function(obj) {
    if ('string' == typeof this.obj) {
      this.assert(
          ~this.obj.indexOf(obj)
          , function() {
            return 'expected ' + inspect(this.obj) + ' to contain ' + inspect(obj)
          }
          , function() {
            return 'expected ' + inspect(this.obj) + ' to not contain ' + inspect(obj)
          });
    } else {
      this.assert(
          ~indexOf(this.obj, obj)
          , function() {
            return 'expected ' + inspect(this.obj) + ' to contain ' + inspect(obj)
          }
          , function() {
            return 'expected ' + inspect(this.obj) + ' to not contain ' + inspect(obj)
          });
    }
    return this;
  };

  /**
   * Assert exact keys or inclusion of keys by using
   * the `.own` modifier.
   *
   * @param {Array|String ...} keys
   * @api public
   */

  Assertion.prototype.key = Assertion.prototype.keys = function($keys) {
    var str;
  var ok = true;

    $keys = isArray($keys) ? $keys : Array.prototype.slice.call(arguments);

    if (!$keys.length) throw new Error('keys required');

    var actual = keys(this.obj);
  var len = $keys.length;

    // Inclusion
    ok = every($keys, function(key) {
      return ~indexOf(actual, key);
    });

    // Strict
    if (!this.flags.not && this.flags.only) {
      ok = ok && $keys.length == actual.length;
    }

    // Key string
    if (len > 1) {
      $keys = map($keys, function(key) {
        return inspect(key);
      });
      var last = $keys.pop();
      str = $keys.join(', ') + ', and ' + last;
    } else {
      str = inspect($keys[0]);
    }

    // Form
    str = (len > 1 ? 'keys ' : 'key ') + str;

    // Have / include
    str = (!this.flags.only ? 'include ' : 'only have ') + str;

    // Assertion
    this.assert(
        ok
        , function() {
          return 'expected ' + inspect(this.obj) + ' to ' + str
        }
        , function() {
          return 'expected ' + inspect(this.obj) + ' to not ' + str
        });

    return this;
  };

  /**
   * Assert a failure.
   *
   * @param {String ...} custom message
   * @api public
   */
  Assertion.prototype.fail = function(msg) {
    var error = function() {
      return msg || "explicit failure";
    }
    this.assert(false, error, error);
    return this;
  };

  /**
   * Array every compatibility
   *
   * @see bit.ly/5Fq1N2
   * @api public
   */

  function every(arr, fn, thisObj) {
    var scope = thisObj || global;
    for (var i = 0, j = arr.length; i < j; ++i) {
      if (!fn.call(scope, arr[i], i, arr)) {
        return false;
      }
    }
    return true;
  }

  function indexOf(arr, o, i) {
    return Array.prototype.indexOf.call(arr, o, i);
  }

  function isArray(obj) {
    return Object.prototype.toString.call(obj) === '[object Array]';
  }

  function isRegExp(obj) {
    return Object.prototype.toString.call(obj) === '[object RegExp]';
  }

  function keys(obj) {
    return Object.keys(obj);
  }

  function map(arr, mapper, that) {
    return Array.prototype.map.call(arr, mapper, that);
  }

  /**
   * Asserts deep equality
   *
   * @see taken from node.js `assert` module (copyright Joyent, MIT license)
   * @api private
   */

  expect.eql = function eql(actual, expected) {
    // 7.1. All identical values are equivalent, as determined by ===.
    if (actual === expected) {
      return true;
    } else if ('undefined' != typeof Buffer
        && Buffer.isBuffer(actual) && Buffer.isBuffer(expected)) {
      if (actual.length != expected.length) return false;

      for (var i = 0; i < actual.length; i++) {
        if (actual[i] !== expected[i]) return false;
      }

      return true;

      // 7.2. If the expected value is a Date object, the actual value is
      // equivalent if it is also a Date object that refers to the same time.
    } else if (actual instanceof Date && expected instanceof Date) {
      return actual.getTime() === expected.getTime();

      // 7.3. Other pairs that do not both pass typeof value == "object",
      // equivalence is determined by ==.
    } else if (typeof actual != 'object' && typeof expected != 'object') {
      return actual == expected;
      // If both are regular expression use the special `regExpEquiv` method
      // to determine equivalence.
    } else if (isRegExp(actual) && isRegExp(expected)) {
      return regExpEquiv(actual, expected);
      // 7.4. For all other Object pairs, including Array objects, equivalence is
      // determined by having the same number of owned properties (as verified
      // with Object.prototype.hasOwnProperty.call), the same set of keys
      // (although not necessarily the same order), equivalent values for every
      // corresponding key, and an identical "prototype" property. Note: this
      // accounts for both named and indexed properties on Arrays.
    } else {
      return objEquiv(actual, expected);
    }
  };

  function isUndefinedOrNull(value) {
    return value === null || value === undefined;
  }

  function isArguments(object) {
    return Object.prototype.toString.call(object) == '[object Arguments]';
  }

  function regExpEquiv(a, b) {
    return a.source === b.source && a.global === b.global &&
        a.ignoreCase === b.ignoreCase && a.multiline === b.multiline;
  }

  function objEquiv(a, b) {
    if (isUndefinedOrNull(a) || isUndefinedOrNull(b))
      return false;
    // an identical "prototype" property.
    if (a.prototype !== b.prototype) return false;
    //~~~I've managed to break Object.keys through screwy arguments passing.
    //   Converting to array solves the problem.
    if (isArguments(a)) {
      if (!isArguments(b)) {
        return false;
      }
      a = pSlice.call(a);
      b = pSlice.call(b);
      return expect.eql(a, b);
    }
    try {
      var ka = keys(a),
          kb = keys(b),
          key, i;
    } catch (e) {//happens when one is a string literal and the other isn't
      return false;
    }
    // having the same number of owned properties (keys incorporates hasOwnProperty)
    if (ka.length != kb.length)
      return false;
    //the same set of keys (although not necessarily the same order),
    ka.sort();
    kb.sort();
    //~~~cheap key test
    for (i = ka.length - 1; i >= 0; i--) {
      if (ka[i] != kb[i])
        return false;
    }
    //equivalent values for every corresponding key, and
    //~~~possibly expensive deep test
    for (i = ka.length - 1; i >= 0; i--) {
      key = ka[i];
      if (!expect.eql(a[key], b[key]))
        return false;
    }
    return true;
  }

});