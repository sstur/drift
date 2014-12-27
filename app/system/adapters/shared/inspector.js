/*global app, define */
define('inspector', function(require, exports) {
  "use strict";

  /**
   * Echos the value of a value. Tries to print the value out
   * in the best way possible given the different types.
   *
   * @param {Object} obj The object to print out.
   * @param {Number} depth Depth in which to descend in object. Default is 2.
   */
  function inspect(obj, depth) {
    var ctx = {
      seen: [],
      stylize: stylizeNoColor
    };
    return formatValue(ctx, obj, (typeof depth === 'undefined' ? 2 : depth));
  }


  function stylizeNoColor(str, styleType) {
    return str;
  }


  function formatValue(ctx, value, recurseTimes) {
    // Provide a hook for user-specified inspect functions.
    // Check that value is an object with an inspect function on it
    if (value && typeof value.inspect === 'function' &&
        // Filter out the util module, it's inspect function is special
        value.inspect !== inspect &&
        // Also filter out any prototype objects using the circular check.
        !(value.constructor && value.constructor.prototype === value)) {
      return value.inspect(recurseTimes);
    }

    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toUTCString.call(value), 'date');
    }

    if (value && typeof value.valueOf == 'function') {
      value = value.valueOf();
    }

    // Primitive types cannot have properties
    var primitive = formatPrimitive(ctx, value);
    if (primitive) {
      return primitive;
    }

    if (typeof value === 'object' && !(value instanceof Object)) {
      //some object from another scope or a non-js type
      return ctx.stylize('[object Object]', 'special');
    }

    // Look up the keys of the object.
    var keys = Object.keys(value);

    // Some type of object without properties can be shortcutted.
    if (keys.length === 0) {
      if (typeof value === 'function') {
        var name = value.name ? ': ' + value.name : '';
        return ctx.stylize('[Function' + name + ']', 'special');
      }
      if (isRegExp(value)) {
        return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
      }
      if (isError(value)) {
        return formatError(value);
      }
    }

    var base = '', array = false, braces = ['{', '}'];

    // Make Array say that they are Array
    if (isArray(value)) {
      array = true;
      braces = ['[', ']'];
    }

    // Make functions say that they are functions
    if (typeof value === 'function') {
      var n = value.name ? ': ' + value.name : '';
      base = ' [Function' + n + ']';
    }

    // Make RegExps say that they are RegExps
    if (isRegExp(value)) {
      base = ' ' + RegExp.prototype.toString.call(value);
    }

    // Make dates with properties first say the date
    if (isDate(value)) {
      base = ' ' + Date.prototype.toUTCString.call(value);
    }

    // Make error with message first say the error
    if (isError(value)) {
      base = ' ' + formatError(value);
    }

    if (keys.length === 0 && (!array || value.length === 0)) {
      return braces[0] + base + braces[1];
    }

    if (recurseTimes < 0) {
      if (isRegExp(value)) {
        return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
      } else {
        return ctx.stylize('[Object]', 'special');
      }
    }

    ctx.seen.push(value);

    var output;
    if (array) {
      output = formatArray(ctx, value, recurseTimes, keys, keys);
    } else {
      output = keys.map(function(key) {
        return formatProperty(ctx, value, recurseTimes, keys, key, array);
      });
    }

    ctx.seen.pop();

    return reduceToSingleString(output, base, braces);
  }


  function formatPrimitive(ctx, value) {
    switch (typeof value) {
      case 'undefined':
        return ctx.stylize('undefined', 'undefined');

      case 'string':
        var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                                 .replace(/'/g, "\\'")
                                                 .replace(/\\"/g, '"') + '\'';
        return ctx.stylize(simple, 'string');

      case 'number':
        return ctx.stylize('' + value, 'number');

      case 'boolean':
        return ctx.stylize('' + value, 'boolean');
    }
    // For some reason typeof null is "object", so special case here.
    if (value === null) {
      return ctx.stylize('null', 'null');
    }
  }


  function formatError(value) {
    return '[' + Error.prototype.toString.call(value) + ']';
  }


  function formatArray(ctx, value, recurseTimes, keys) {
    var output = [];
    for (var i = 0, l = value.length; i < l; ++i) {
      if (Object.prototype.hasOwnProperty.call(value, String(i))) {
        output.push(formatProperty(ctx, value, recurseTimes, keys, String(i), true));
      } else {
        output.push('');
      }
    }
    keys.forEach(function(key) {
      if (!key.match(/^\d+$/)) {
        output.push(formatProperty(ctx, value, recurseTimes, keys, key, true));
      }
    });
    return output;
  }


  function formatProperty(ctx, value, recurseTimes, keys, key, array) {
    var desc = { value: value[key] };
    if (keys.indexOf(key) < 0) {
      var name = '[' + key + ']';
    }
    var str;
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (recurseTimes === null) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
    if (typeof name === 'undefined') {
      if (array && key.match(/^\d+$/)) {
        return str;
      }
      name = JSON.stringify('' + key);
      if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
        name = name.substr(1, name.length - 2);
        name = ctx.stylize(name, 'name');
      } else {
        name = name.replace(/'/g, "\\'")
                   .replace(/\\"/g, '"')
                   .replace(/(^"|"$)/g, "'");
        name = ctx.stylize(name, 'string');
      }
    }

    return name + ': ' + str;
  }


  function reduceToSingleString(output, base, braces) {
    var numLinesEst = 0;
    var length = 0;
    output.forEach(function(str) {
      numLinesEst++;
      if (str.indexOf('\n') >= 0) numLinesEst++;
      length += str.length + 1;
    });

    if (length > 60) {
      return braces[0] +
             (base === '' ? '' : base + '\n ') +
             ' ' +
             output.join(',\n  ') +
             ' ' +
             braces[1];
    }

    return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
  }


  // NOTE: These type checking functions intentionally don't use `instanceof`
  // because it is fragile and can be easily faked with `Object.create()`.
  function isArray(ar) {
    return Array.isArray(ar) || (typeof ar === 'object' && objectToString(ar) === '[object Array]');
  }


  function isRegExp(re) {
    return typeof re === 'object' && objectToString(re) === '[object RegExp]';
  }


  function isDate(d) {
    return typeof d === 'object' && objectToString(d) === '[object Date]';
  }


  function isError(e) {
    return typeof e === 'object' && objectToString(e) === '[object Error]';
  }


  function objectToString(o) {
    return Object.prototype.toString.call(o);
  }


  exports.inspect = inspect;

});