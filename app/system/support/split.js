/**
 * Patches native String#split method.
 *
 * If using fix-regexp this patch is redundant.
 *
 */
(function() {

  /**
   * Cross-Browser Split 1.0.1
   * (c) Steven Levithan <stevenlevithan.com>; MIT License
   * An ECMA-compliant, uniform cross-browser split method
   *
   */

  var nothing, cbSplit, nativeSplit = String.prototype.split;

  cbSplit = function (str, separator, limit) {
    // if `separator` is not a regex, use the native `split`
    if (Object.prototype.toString.call(separator) !== "[object RegExp]") {
      return nativeSplit.call(str, separator, limit);
    }

    var output = [],
      lastLastIndex = 0,
      flags = (separator.ignoreCase ? "i" : "") +
        (separator.multiline ? "m" : "") +
        (separator.sticky ? "y" : ""),
      separator2, match, lastIndex, lastLength;

    // make `global` and avoid `lastIndex` issues by working with a copy
    separator = RegExp(separator.source, flags + "g");
    str = str + ""; // type conversion
    separator2 = RegExp("^" + separator.source + "$(?!\\s)", flags); // doesn't need /g or /y, but they don't hurt

    /* behavior for `limit`: if it's...
     - `undefined`: no limit.
     - `NaN` or zero: return an empty array.
     - a positive number: use `Math.floor(limit)`.
     - a negative number: no limit.
     - other: type-convert, then use the above rules. */
    if (limit === nothing || +limit < 0) {
      limit = Infinity;
    } else {
      limit = Math.floor(+limit);
      if (!limit) {
        return [];
      }
    }

    while (match = separator.exec(str)) {
      lastIndex = match.index + match[0].length; // `separator.lastIndex` is not reliable cross-browser

      if (lastIndex > lastLastIndex) {
        output.push(str.slice(lastLastIndex, match.index));

        // `exec` methods don't consistently return `undefined` for nonparticipating capturing groups
        match[0].replace(separator2, function () {
          for (var i = 1; i < arguments.length - 2; i++) {
            if (arguments[i] === nothing) {
              match[i] = nothing;
            }
          }
        });

        if (match.length > 1 && match.index < str.length) {
          Array.prototype.push.apply(output, match.slice(1));
        }

        lastLength = match[0].length;
        lastLastIndex = lastIndex;

        if (output.length >= limit) {
          break;
        }
      }

      if (separator.lastIndex === match.index) {
        separator.lastIndex++; // avoid an infinite loop
      }
    }

    if (lastLastIndex === str.length) {
      if (lastLength || !separator.test("")) {
        output.push("");
      }
    } else {
      output.push(str.slice(lastLastIndex));
    }

    return output.length > limit ? output.slice(0, limit) : output;
  };

  String.prototype.split = function (separator, limit) {
    return cbSplit(this, separator, limit);
  };

})();