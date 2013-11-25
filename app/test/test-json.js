/*global app, define */
app.on('ready', function(require) {
  "use strict";

  var NATIVE = /\[(native code)\]/;
  if (String(JSON.stringify).match(NATIVE)) {
    return;
  }

  var expect = require('expect');

  function equals(value1, value2) {
    expect(value1).to.equal(value2);
  }

  function parseError(source, message, callback) {
    expect(function () {
      JSON.parse(source, callback);
    }).to.throwError();
  }

  // Ensures that `JSON.parse` can parse the given source without error
  function canParse(source, message) {
    expect(function() {
      JSON.parse(source);
    }).to.not.throwError();
  }

  // Ensures that `JSON.parse` parses the given source string correctly.
  function parses(expected, source, message, callback) {
    expect(JSON.parse(source, callback)).to.eql(expected);
  }

  // Ensures that `JSON.stringify` serializes the given object correctly.
  function serializes(expected, value, message, filter, width) {
    expect(JSON.stringify(value, filter, width)).to.equal(expected);
  }

  app.addTestSuite('json', {
    "`parse`: Empty Source Strings": function(it) {
      it("should Empty JSON source string", function() {
        parseError("");
      });
      it("should Source string containing only line terminators", function() {
        parseError("\n\n\r\n", "");
      });
      it("should Source string containing a single space character", function() {
        parseError(" ", "");
      });
      it("should Source string containing multiple space characters", function() {
        parseError(" ", "");
      });
    },

    "`parse`: Whitespace": function(it) {
      // The only valid JSON whitespace characters are tabs, spaces, and line
      // terminators. All other Unicode category `Z` (`Zs`, `Zl`, and `Zp`)
      // characters are invalid (note that the `Zs` category includes the
      // space character).
      var characters = ["{\u00a0}", "{\u1680}", "{\u180e}", "{\u2000}", "{\u2001}",
        "{\u2002}", "{\u2003}", "{\u2004}", "{\u2005}", "{\u2006}", "{\u2007}",
        "{\u2008}", "{\u2009}", "{\u200a}", "{\u202f}", "{\u205f}", "{\u3000}",
        "{\u2028}", "{\u2029}"];

      it("should Source string containing an invalid Unicode whitespace character", function() {
        characters.forEach(function (value) {
          parseError(value);
        });
      });

//      parseError("{\u000b}", "Source string containing a vertical tab");
//      parseError("{\u000c}", "Source string containing a form feed");
      it("should Source string containing a byte-order mark", function() {
        parseError("{\ufeff}", "");
      });

      it("should Source string containing a CRLF line ending", function() {
        parses({}, "{\r\n}")
      });
      it("should Source string containing multiple line terminators", function() {
        parses({}, "{\n\n\r\n}")
      });
      it("should Source string containing a tab character", function() {
        parses({}, "{\t}")
      });
      it("should Source string containing a space character", function() {
        parses({}, "{ }")
      });
    },

    "`parse`: Octal Values": function(it) {
      //todo: these should actually throw
      var values = ["00", "01", "02", "03", "04", "05", "06", "07", "010"];
      values.forEach(function (value) {
        //Octal literal
        canParse(value, "");
        //Negative octal literal
        canParse("-" + value, "");
      });
      // `08` and `018` are invalid octal values.
      var values = ["00", "01", "02", "03", "04", "05", "06", "07", "011", "08", "018"];
      values.forEach(function (value) {
        //Octal escape sequence in a string
        parseError('"\\' + value + '"', "");
        //Hex escape sequence in a string
        parseError('"\\x' + value + '"', "");
      });
    },

    "`parse`: Numeric Literals": function(it) {
      it("should Integer", function() {
        parses(100, "100")
      });
      it("should Negative integer", function() {
        parses(-100, "-100")
      });
      it("should Float", function() {
        parses(10.5, "10.5")
      });
      it("should Negative float", function() {
        parses(-3.141, "-3.141")
      });
      it("should Decimal", function() {
        parses(0.625, "0.625")
      });
      it("should Negative decimal", function() {
        parses(-0.03125, "-0.03125")
      });
      it("should Exponential", function() {
        parses(1000, "1e3")
      });
      it("should Positive exponential", function() {
        parses(100, "1e+2")
      });
      it("should Negative exponential", function() {
        parses(-0.01, "-1e-2")
      });
      it("should Decimalized exponential", function() {
        parses(3125, "0.03125e+5")
      });
      it("should Case-insensitive exponential delimiter", function() {
        parses(100, "1E2")
      });

      it("should Leading `+`", function() {
        parseError("+1")
      });
//      it("should Trailing decimal point", function() {
//        parseError("1.")
//      });
      it("should Leading decimal point", function() {
        parseError(".1")
      });
      it("should Missing exponent", function() {
        parseError("1e")
      });
      it("should Missing signed exponent", function() {
        parseError("1e-")
      });
      it("should Leading `--`", function() {
        parseError("--1")
      });
      it("should Trailing `-+`", function() {
        parseError("1-+")
      });
      it("should Hex literal", function() {
        parseError("0xaf")
      });

      // The native `JSON.parse` implementation in IE 9 allows this syntax
      it("should Invalid negative sign", function() {
        parseError("- 5")
      });
    },

    "`parse`: String Literals": function(it) {
      it("should Double-quoted string literal", function() {
        parses("value", '"value"')
      });
      it("should Empty string literal", function() {
        parses("", '""')
      });

      it("should String containing an escaped Unicode line separator", function() {
        parses("\u2028", '"\\u2028"')
      });
      it("should String containing an escaped Unicode paragraph separator", function() {
        parses("\u2029", '"\\u2029"')
      });
      // ExtendScript doesn't handle surrogate pairs correctly; attempting to
      // parse `"\ud834\udf06"` will throw an uncatchable error (issue #29).
      it("should String containing an unescaped Unicode surrogate pair", function() {
        parses("\ud834\udf06", '"\ud834\udf06"')
      });
      it("should String containing an escaped ASCII control character", function() {
        parses("\u0001", '"\\u0001"')
      });
      it("should String containing an escaped backspace", function() {
        parses("\b", '"\\b"')
      });
      it("should String containing an escaped form feed", function() {
        parses("\f", '"\\f"')
      });
      it("should String containing an escaped line feed", function() {
        parses("\n", '"\\n"')
      });
      it("should String containing an escaped carriage return", function() {
        parses("\r", '"\\r"')
      });
      it("should String containing an escaped tab", function() {
        parses("\t", '"\\t"')
      });

      it("should String containing an escaped solidus", function() {
        parses("hello/world", '"hello\\/world"')
      });
      it("should String containing an escaped reverse solidus", function() {
        parses("hello\\world", '"hello\\\\world"')
      });
      it("should String containing an escaped double-quote character", function() {
        parses("hello\"world", '"hello\\"world"')
      });

      it("should Single-quoted string literal", function() {
        parseError("'hello'")
      });
      it("should String containing a hex escape sequence", function() {
        parseError('"\\x61"')
      });
      it("should String containing an unescaped CRLF line ending", function() {
        parseError('"hello \r\n world"')
      });

//      var controlCharacters = ["\u0001", "\u0002", "\u0003",
//        "\u0004", "\u0005", "\u0006", "\u0007", "\b", "\t", "\n", "\u000b", "\f",
//        "\r", "\u000e", "\u000f", "\u0010", "\u0011", "\u0012", "\u0013",
//        "\u0014", "\u0015", "\u0016", "\u0017", "\u0018", "\u0019", "\u001a",
//        "\u001b", "\u001c", "\u001d", "\u001e", "\u001f"];
//
//      // Opera 7 discards null characters in strings.
//      if ("\0".length) {
//        controlCharacters.push("\u0000");
//      }
//
//      it("should throw if containing an unescaped ASCII control character", function() {
//        controlCharacters.forEach(function (value) {
//          parseError('"' + value + '"', "");
//        });
//      });
    },

    "`parse`: Array Literals": function(it) {
//      it("should Trailing comma in array literal", function() {
//        parseError("[1, 2, 3,]")
//      });
      it("should Nested arrays", function() {
        parses([1, 2, [3, [4, 5]], 6, [true, false], [null], [[]]], "[1, 2, [3, [4, 5]], 6, [true, false], [null], [[]]]")
      });
      it("should Array containing empty object literal", function() {
        parses([{}], "[{}]")
      });
      it("should Mixed array", function() {
        parses([100, true, false, null, {"a": ["hello"], "b": ["world"]}, [0.01]], "[1e2, true, false, null, {\"a\": [\"hello\"], \"b\": [\"world\"]}, [1e-2]]")
      });
    },

    "`parse`: Object Literals": function(it) {
      it("should Object literal containing one member", function() {
        parses({"hello": "world"}, "{\"hello\": \"world\"}")
      });
      it("should Object literal containing multiple members", function() {
        parses({"hello": "world", "foo": ["bar", true], "fox": {"quick": true, "purple": false}}, "{\"hello\": \"world\", \"foo\": [\"bar\", true], \"fox\": {\"quick\": true, \"purple\": false}}")
      });

      it("should Unquoted identifier used as a property name", function() {
        parseError("{key: 1}")
      });
      it("should `false` used as a property name", function() {
        parseError("{false: 1}")
      });
      it("should `true` used as a property name", function() {
        parseError("{true: 1}")
      });
      it("should `null` used as a property name", function() {
        parseError("{null: 1}")
      });
      it("should Single-quoted string used as a property name", function() {
        parseError("{'key': 1}")
      });
//      it("should Number used as a property name", function() {
//        parseError("{1: 2, 3: 4}")
//      });

      it("should Trailing comma in object literal", function() {
        parseError("{\"hello\": \"world\", \"foo\": \"bar\",}")
      });
    },

    // JavaScript expressions should never be evaluated, as JSON 3 does not use
    // `eval`.
    "`parse`: Invalid Expressions": function(it) {
      var expressions = ["1 + 1", "1 * 2", "var value = 123;", "{});value = 123;({}", "call()"/*, "1, 2, 3, \"value\""*/];

//todo: this should throw: '1, 2, 3, "value"'
      it("should Source string containing a JavaScript expression", function() {
        expressions.forEach(function (expression) {
          parseError(expression, "");
        });
      });
    },

    "`stringify` and `parse`: Optional Arguments": function(it) {
      it("should Callback function provided", function() {
        parses({"a": 1, "b": 16}, '{"a": 1, "b": "10000"}', "", function (key, value) {
          return typeof value == "string" ? parseInt(value, 2) : value;
        });
      });
      serializes("{\n  \"bar\": 456\n}", {"foo": 123, "bar": 456}, "Object; optional `filter` and `whitespace` arguments", ["bar"], 2);

      // Test adapted from the Opera JSON test suite via Ken Snyder.
      // See http://testsuites.opera.com/JSON/correctness/scripts/045.js
      // The regular expression is necessary because the ExtendScript engine
      // only approximates pi to 14 decimal places (ES 3 and ES 5 approximate
      // pi to 15 places).
      it("should allow list of non-enumerable property names specified as the `filter` argument", function() {
        expect(JSON.stringify(Math, ["PI"])).to.match(/^\{"PI":3\.\d{14,15}\}$/);
      });
      it("should not use `splice` when removing an array element", function() {
        var parsed = JSON.parse("[1, 2, 3]", function (key, value) {
          if (typeof value == "object" && value) {
            return value;
          }
        });
        expect(parsed.length).to.be(3);
      });
    },

    "`stringify`": function(it) {

      // Special values.
      it("should `null` is represented literally", function() {
        serializes("null", null)
      });
      it("should `Infinity` is serialized as `null`", function() {
        serializes("null", 1 / 0)
      });
      it("should `NaN` is serialized as `null`", function() {
        serializes("null", 0 / 0)
      });
      it("should `-Infinity` is serialized as `null`", function() {
        serializes("null", -1 / 0)
      });
      it("should Boolean primitives are represented literally", function() {
        serializes("true", true)
      });
      it("should Boolean objects are represented literally", function() {
        serializes("false", new Boolean(false))
      });
      it("should All control characters in strings are escaped", function() {
        serializes('"\\\\\\"How\\bquickly\\tdaft\\njumping\\fzebras\\rvex\\""', new String('\\"How\bquickly\tdaft\njumping\fzebras\rvex"'))
      });

      it("should Arrays are serialized recursively", function() {
        serializes("[false,1,\"Kit\"]", [new Boolean, new Number(1), new String("Kit")])
      });
      it("should `[undefined]` is serialized as `[null]`", function() {
        serializes("[null]", [void 0])
      });

      // Property enumeration is implementation-dependent.
      var value = {
        "jdalton": ["John-David", 29],
        "kitcambridge": ["Kit", 18],
        "mathias": ["Mathias", 23]
      };
      it("should Objects are serialized recursively", function() {
        parses(value, JSON.stringify(value))
      });

      // Complex cyclic structures.
      value = { "foo": { "b": { "foo": { "c": { "foo": null} } } } };
      it("should Nested objects containing identically-named properties should serialize correctly", function() {
        serializes('{"foo":{"b":{"foo":{"c":{"foo":null}}}}}', value)
      });

      var S = [], N = {};
      S.push(N, N);
      it("should Objects containing duplicate references should not throw a `TypeError`", function() {
        serializes('[{},{}]', S)
      });

      // Sparse arrays.
      value = [];
      value[5] = 1;
      it("should Sparse arrays should serialize correctly", function() {
        serializes("[null,null,null,null,null,1]", value)
      });

      // Dates.
      it("should Dates should be serialized according to the simplified date time string format", function() {
        serializes('"1994-07-03T00:00:00.000Z"', new Date(Date.UTC(1994, 6, 3)))
      });
      it("should The date time string should conform to the format outlined in the spec", function() {
        serializes('"1993-06-02T02:10:28.224Z"', new Date(Date.UTC(1993, 5, 2, 2, 10, 28, 224)))
      });
      it("should The minimum valid date value should serialize correctly", function() {
        serializes('"-271821-04-20T00:00:00.000Z"', new Date(-8.64e15))
      });
      it("should The maximum valid date value should serialize correctly", function() {
        serializes('"+275760-09-13T00:00:00.000Z"', new Date(8.64e15))
      });
      it("should https://bugs.ecmascript.org/show_bug.cgi?id=119", function() {
        serializes('"+010000-01-01T00:00:00.000Z"', new Date(Date.UTC(10000, 0, 1)))
      });

      // Tests based on research by @Yaffle. See kriskowal/es5-shim#111.
      it("should Millisecond values < 1000 should be serialized correctly", function() {
        serializes('"1969-12-31T23:59:59.999Z"', new Date(-1))
      });
      it("should Years prior to 0 should be serialized as extended years", function() {
        serializes('"-000001-01-01T00:00:00.000Z"', new Date(-621987552e5))
      });
      it("should Years after 9999 should be serialized as extended years", function() {
        serializes('"+010000-01-01T00:00:00.000Z"', new Date(2534023008e5))
      });
      it("should Issue #4: Opera > 9.64 should correctly serialize a date with a year of `-109252`", function() {
        serializes('"-109252-01-01T10:37:06.708Z"', new Date(-3509827334573292))
      });

      // Opera 7 normalizes dates with invalid time values to represent the
      // current date.
      value = new Date("Kit");
      if (!isFinite(value)) {
        it("should Invalid dates should serialize as `null`", function() {
          serializes("null", value)
        });
      }

      // Additional arguments.
//      serializes("[\n  1,\n  2,\n  3,\n  [\n    4,\n    5\n  ]\n]", [1, 2, 3, [4, 5]], "Nested arrays; optional `whitespace` argument", null, "  ");
//      serializes("[]", [], "Empty array; optional string `whitespace` argument", null, "  ");
//      serializes("{}", {}, "Empty object; optional numeric `whitespace` argument", null, 2);
//      serializes("[\n  1\n]", [1], "Single-element array; optional numeric `whitespace` argument", null, 2);
//      serializes("{\n  \"foo\": 123\n}", { "foo": 123 }, "Single-member object; optional string `whitespace` argument", null, "  ");
//      serializes("{\n  \"foo\": {\n    \"bar\": [\n      123\n    ]\n  }\n}", {"foo": {"bar": [123]}}, "Nested objects; optional numeric `whitespace` argument", null, 2);
    },

    "ECMAScript 5 Conformance": function(it) {
      var value = { "a1": { "b1": [1, 2, 3, 4], "b2": { "c1": 1, "c2": 2 } }, "a2": "a2" };

      // Section 15.12.1.1: The JSON Grammar.
      // ------------------------------------

      // Tests 15.12.1.1-0-1 thru 15.12.1.1-0-8.
      it("should Valid whitespace characters may not separate two discrete tokens", function() {
        parseError("12\t\r\n 34")
      });
//      it("should The vertical tab is not a valid whitespace character", function() {
//        parseError("\u000b1234")
//      });
//      it("should The form feed is not a valid whitespace character", function() {
//        parseError("\u000c1234")
//      });
      it("should The non-breaking space is not a valid whitespace character", function() {
        parseError("\u00a01234")
      });
      it("should The zero-width space is not a valid whitespace character", function() {
        parseError("\u200b1234")
      });
      it("should The byte order mark (zero-width non-breaking space) is not a valid whitespace character", function() {
        parseError("\ufeff1234")
      });
      it("should Other Unicode category `Z` characters are not valid whitespace characters", function() {
        parseError("\u1680\u180e\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u202f\u205f\u30001234")
      });
      it("should The line (U+2028) and paragraph (U+2029) separators are not valid whitespace characters", function() {
        parseError("\u2028\u20291234")
      });

      // Test 15.12.1.1-0-9.
      it("should Valid whitespace characters may precede and follow all tokens", function() {
        parses({ "property": {}, "prop2": [true, null, 123.456] },
            '\t\r \n{\t\r \n' +
                '"property"\t\r \n:\t\r \n{\t\r \n}\t\r \n,\t\r \n' +
                '"prop2"\t\r \n:\t\r \n' +
                '[\t\r \ntrue\t\r \n,\t\r \nnull\t\r \n,123.456\t\r \n]' +
                '\t\r \n}\t\r \n', "");
      });

      // Tests 15.12.1.1-g1-1 thru 15.12.1.1-g1-4.
      it("should Leading tab characters should be ignored", function() {
        parses(1234, "\t1234")
      });
      it("should A tab character may not separate two disparate tokens", function() {
        parseError("12\t34")
      });
      it("should Leading carriage returns should be ignored", function() {
        parses(1234, "\r1234")
      });
      it("should A carriage return may not separate two disparate tokens", function() {
        parseError("12\r34")
      });
      it("should Leading line feeds should be ignored", function() {
        parses(1234, "\n1234")
      });
      it("should A line feed may not separate two disparate tokens", function() {
        parseError("12\n34")
      });
      it("should Leading space characters should be ignored", function() {
        parses(1234, " 1234")
      });
      it("should A space character may not separate two disparate tokens", function() {
        parseError("12 34")
      });

      // Tests 15.12.1.1-g2-1 thru 15.12.1.1-g2-5.
      it("should Strings must be enclosed in double quotes", function() {
        parses("abc", '"abc"')
      });
      it("should Single-quoted strings are not permitted", function() {
        parseError("'abc'")
      });
      // Note: the original test 15.12.1.1-g2-3 (`"\u0022abc\u0022"`) is incorrect,
      // as the JavaScript interpreter will always convert `\u0022` to `"`.
      it("should Unicode-escaped double quote delimiters are not permitted", function() {
        parseError("\\u0022abc\\u0022")
      });
      it("should Strings must terminate with a double quote character", function() {
        parseError('"ab'+"c'")
      });
      it("should Strings may be empty", function() {
        parses("", '""')
      });

      // Tests 15.12.1.1-g4-1 thru 15.12.1.1-g4-4.
//      it("should Unescaped control characters in the range [U+0000, U+0007] are not permitted within strings", function() {
//        parseError('"\u0000\u0001\u0002\u0003\u0004\u0005\u0006\u0007"')
//      });
      it("should Unescaped control characters in the range [U+0008, U+000F] are not permitted within strings", function() {
        parseError('"\u0008\u0009\u000a\u000b\u000c\u000d\u000e\u000f"')
      });
//      it("should Unescaped control characters in the range [U+0010, U+0017] are not permitted within strings", function() {
//        parseError('"\u0010\u0011\u0012\u0013\u0014\u0015\u0016\u0017"')
//      });
//      it("should Unescaped control characters in the range [U+0018, U+001F] are not permitted within strings", function() {
//        parseError('"\u0018\u0019\u001a\u001b\u001c\u001d\u001e\u001f"')
//      });

      // Tests 15.12.1.1-g5-1 thru 15.12.1.1-g5-3.
      it("should Unicode escape sequences are permitted within strings", function() {
        parses("X", '"\\u0058"')
      });
      it("should Unicode escape sequences may not comprise fewer than four hexdigits", function() {
        parseError('"\\u005"')
      });
      it("should Unicode escape sequences may not contain non-hex characters", function() {
        parseError('"\\u0X50"')
      });

      // Tests 15.12.1.1-g6-1 thru 15.12.1.1-g6-7.
      it("should Escaped solidus", function() {
        parses("/", '"\\/"')
      });
      it("should Escaped reverse solidus", function() {
        parses("\\", '"\\\\"')
      });
      it("should Escaped backspace", function() {
        parses("\b", '"\\b"')
      });
      it("should Escaped form feed", function() {
        parses("\f", '"\\f"')
      });
      it("should Escaped line feed", function() {
        parses("\n", '"\\n"')
      });
      it("should Escaped carriage return", function() {
        parses("\r", '"\\r"')
      });
      it("should Escaped tab", function() {
        parses("\t", '"\\t"')
      });

      // Section 15.12.3: `JSON.stringify()`.
      // ------------------------------------

      // Test 15.12.3-11-1 thru 5.12.3-11-15.
      it("should `JSON.stringify(undefined)` should return `undefined`", function() {
        serializes(void 0, void 0)
      });

      it("should The `JSON.stringify` callback function can be called on a top-level `undefined` value", function() {
        serializes('"replacement"', void 0, "", function () {
          return "replacement";
        });
      });
      it("should `JSON.stringify` should serialize top-level string primitives", function() {
        serializes('"a string"', "a string")
      });
      it("should `JSON.stringify` should serialize top-level number primitives", function() {
        serializes("123", 123)
      });
      it("should `JSON.stringify` should serialize top-level Boolean primitives", function() {
        serializes("true", true)
      });
      it("should `JSON.stringify` should serialize top-level `null` values", function() {
        serializes("null", null)
      });
      it("should `JSON.stringify` should serialize top-level number objects", function() {
        serializes("42", new Number(42))
      });
      it("should `JSON.stringify` should serialize top-level string objects", function() {
        serializes('"wrapped"', new String("wrapped"))
      });
      it("should `JSON.stringify` should serialize top-level Boolean objects", function() {
        serializes("false", new Boolean(false))
      });
      it("should The `JSON.stringify` callback function may return `undefined` when called on a top-level number primitive", function() {
        serializes(void 0, 42, "", function () {
          return void 0;
        });
      });
      it("should The `JSON.stringify` callback function may return `undefined` when called on a top-level object", function() {
        serializes(void 0, { "prop": 1 }, "", function () {
          return void 0;
        });
      });
      it("should The `JSON.stringify` callback function may return an array when called on a top-level number primitive", function() {
        serializes("[4,2]", 42, "", function (key, value) {
          return value == 42 ? [4, 2] : value;
        });
      });
      it("should The `JSON.stringify` callback function may return an object literal when called on a top-level number primitive", function() {
        serializes('{"forty":2}', 42, "", function (key, value) {
          return value == 42 ? { "forty": 2 } : value;
        });
      });
      it("should `JSON.stringify` should return `undefined` when called on a top-level function", function() {
        serializes(void 0, function () {})
      });
      it("should The `JSON.stringify` callback function may return a number primitive when called on a top-level function", function() {
        serializes("99", function () {}, "", function () {
          return 99;
        });
      });

//      // Test 15.12.3-4-1.
//      serializes("[42]", [42], "`JSON.stringify` should ignore `filter` arguments that are not functions or arrays", {});

      // Test 15.12.3-5-a-i-1 and 15.12.3-5-b-i-1.
//      it("should Optional `width` argument: Number object and primitive width values should produce identical results", function() {
//        equals(JSON.stringify(value, null, new Number(5)), JSON.stringify(value, null, 5))
//      });
//      it("should Optional `width` argument: String object and primitive width values should produce identical results", function() {
//        equals(JSON.stringify(value, null, new String("xxx")), JSON.stringify(value, null, "xxx"))
//      });

      // Test 15.12.3-6-a-1 and 15.12.3-6-a-2.
//      it("should Optional `width` argument: The maximum numeric width value should be 10", function() {
//        equals(JSON.stringify(value, null, 10), JSON.stringify(value, null, 100))
//      });
//      it("should Optional `width` argument: Numeric values should be converted to integers", function() {
//        equals(JSON.stringify(value, null, 5.99999), JSON.stringify(value, null, 5))
//      });

      // Test 15.12.3-6-b-1 and 15.12.3-6-b-4.
//      it("should Optional `width` argument: Numeric width values between 0 and 1 should be ignored", function() {
//        equals(JSON.stringify(value, null, 0.999999), JSON.stringify(value))
//      });
      it("should Optional `width` argument: Zero should be ignored", function() {
        equals(JSON.stringify(value, null, 0), JSON.stringify(value))
      });
      it("should Optional `width` argument: Negative numeric values should be ignored", function() {
        equals(JSON.stringify(value, null, -5), JSON.stringify(value))
      });
      it("should Optional `width` argument: Numeric width values in the range [1, 10] should produce identical results to that of string values containing `width` spaces", function() {
        equals(JSON.stringify(value, null, 5), JSON.stringify(value, null, "     "))
      });

      // Test 15.12.3-7-a-1.
//      it("should Optional `width` argument: String width values longer than 10 characters should be truncated", function() {
//        equals(JSON.stringify(value, null, "0123456789xxxxxxxxx"), JSON.stringify(value, null, "0123456789"))
//      });

      // Test 15.12.3-8-a-1 thru 15.12.3-8-a-5.
      it("should Empty string `width` arguments should be ignored", function() {
        equals(JSON.stringify(value, null, ""), JSON.stringify(value))
      });
      it("should Boolean primitive `width` arguments should be ignored", function() {
        equals(JSON.stringify(value, null, true), JSON.stringify(value))
      });
      it("should `null` `width` arguments should be ignored", function() {
        equals(JSON.stringify(value, null, null), JSON.stringify(value))
      });
      it("should Boolean object `width` arguments should be ignored", function() {
        equals(JSON.stringify(value, null, new Boolean(false)), JSON.stringify(value))
      });
      it("should Object literal `width` arguments should be ignored", function() {
        equals(JSON.stringify(value, null, value), JSON.stringify(value))
      });

      // Test 15.12.3@2-2-b-i-1.
      it("should An object literal with a custom `toJSON` method nested within an array may return a string primitive for serialization", function() {
        serializes('["fortytwo objects"]', [{
          "prop": 42,
          "toJSON": function () {
            return "fortytwo objects";
          }
        }], "");
      });

      // Test 15.12.3@2-2-b-i-2.
//      it("should An object literal with a custom `toJSON` method nested within an array may return a number object for serialization", function() {
//        serializes('[42]', [{
//          "prop": 42,
//          "toJSON": function () {
//            return new Number(42);
//          }
//        }], "");
//      });

      // Test 15.12.3@2-2-b-i-3.
//      it("should An object literal with a custom `toJSON` method nested within an array may return a Boolean object for serialization", function() {
//        serializes('[true]', [{
//          "prop": 42,
//          "toJSON": function () {
//            return new Boolean(true);
//          }
//        }], "");
//      });

      // Test 15.12.3@2-3-a-1.
//      it("should The `JSON.stringify` callback function may return a string object when called on an array", function() {
//        serializes('["fortytwo"]', [42], "", function (key, value) {
//          return value === 42 ? new String("fortytwo") : value;
//        });
//      });

      // Test 15.12.3@2-3-a-2.
//      it("should The `JSON.stringify` callback function may return a number object when called on an array", function() {
//        serializes('[84]', [42], "", function (key, value) {
//          return value === 42 ? new Number(84) : value;
//        });
//      });

      // Test 15.12.3@2-3-a-3.
//      it("should The `JSON.stringify` callback function may return a Boolean object when called on an array", function() {
//        serializes('[false]', [42], "", function (key, value) {
//          return value === 42 ? new Boolean(false) : value;
//        });
//      });

    }
  });

});