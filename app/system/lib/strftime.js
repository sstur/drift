/*global app, define */
/**
 * strftime for Javascript
 * version: 1.3
 * date: 2008/06
 *
 * Copyright (c) 2008, Philip S Tellis <philip@bluesmoon.info>
 * All rights reserved.
 *
 * This code is distributed under the terms of the BSD licence
 *
 * Implements strftime for the Date object in javascript based on the PHP implementation described at
 * http://www.php.net/strftime  This is in turn based on the Open Group specification defined
 * at http://www.opengroup.org/onlinepubs/007908799/xsh/strftime.html This implementation does not
 * include modified conversion specifiers (i.e., Ex and Ox)
 *
 * %a - abbreviated weekday name according to the current locale
 * %A - full weekday name according to the current locale
 * %b - abbreviated month name according to the current locale
 * %B - full month name according to the current locale
 * %c - preferred date and time representation for the current locale
 * %C - century number (the year divided by 100 and truncated to an integer, range 00 to 99)
 * %d - day of the month as a decimal number (range 01 to 31)
 * %D - same as %m/%d/%y
 * %e - day of the month as a decimal number, a single digit is preceded by a space (range ' 1' to '31')
 * %g - like %G, but without the century
 * %G - The 4-digit year corresponding to the ISO week number
 * %h - same as %b
 * %H - hour as a decimal number using a 24-hour clock (range 00 to 23)
 * %I - hour as a decimal number using a 12-hour clock (range 01 to 12)
 * %j - day of the year as a decimal number (range 001 to 366)
 * %m - month as a decimal number (range 01 to 12)
 * %M - minute as a decimal number
 * %n - newline character
 * %p - either `AM' or `PM' according to the given time value, or the corresponding strings for the current locale
 * %P - like %p, but lower case
 * %r - time in a.m. and p.m. notation equal to %I:%M:%S %p
 * %R - time in 24 hour notation equal to %H:%M
 * %S - second as a decimal number
 * %t - tab character
 * %T - current time, equal to %H:%M:%S
 * %u - weekday as a decimal number [1,7], with 1 representing Monday
 * %U - week number of the current year as a decimal number, starting with
 *            the first Sunday as the first day of the first week
 * %V - The ISO 8601:1988 week number of the current year as a decimal number,
 *            range 01 to 53, where week 1 is the first week that has at least 4 days
 *            in the current year, and with Monday as the first day of the week.
 * %w - day of the week as a decimal, Sunday being 0
 * %W - week number of the current year as a decimal number, starting with the
 *            first Monday as the first day of the first week
 * %x - preferred date representation for the current locale without the time
 * %X - preferred time representation for the current locale without the date
 * %y - year as a decimal number without a century (range 00 to 99)
 * %Y - year as a decimal number including the century
 * %z - numerical time zone representation
 * %Z - time zone name or abbreviation
 * %% - a literal `%' character
 *
 * See the PHP implementation which is the basis for this
 * http://www.php.net/strftime
 * http://tech.bluesmoon.info/2008/04/strftime-in-javascript.html
 */
define('strftime', function(require, exports) {

  //! All supporting objects go in exports
  var ext = exports;

  //! Global config
  var config = ext.config = {};

  //! Utility methods
  var util = ext.util = {};

  /**
   * Left pad a number
   *
   * @param x - The number to pad
   * @param pad - The string to pad with
   * @param [r=10] - Upper limit: A value of 10 pads to 2 digits, a value of 100 pads to 3 digits.
   */
  util.xPad = function(x, pad, r) {
    if (typeof(r) == 'undefined') {
      r = 10;
    }
    for (; parseInt(x, 10) < r && r > 1; r /= 10)
      x = pad.toString() + x;
    return x.toString();
  };

  /**
   * Extend an object with the properties and values of another
   */
  util.extend = function(target) {
    var args = Array.prototype.slice.call(arguments, 1);
    for (var i = 0, len = args.length; i < len; i++) {
      for (var n in args[i]) {
        if (args[i].hasOwnProperty(n))
          target[n] = args[i][n];
      }
    }
    return target;
  };

  /**
   * Default Locale
   * The locale for a specific date instance can be specified by setting a 'locale' property on the date object;
   */
  config.locale = 'en';

  var locales = ext.locales = { };

  /**
   * Localised strings for days of the week and months of the year.
   *
   * a - Short names of days of week starting with Sunday
   * A - Long names days of week starting with Sunday
   * b - Short names of months of the year starting with January
   * B - Long names of months of the year starting with February
   * c - The preferred date and time representation in your locale
   * p - AM or PM in your locale
   * P - am or pm in your locale
   * x - The preferred date representation for the current locale without the time.
   * X - The preferred time representation for the current locale without the date.
   *
   */
  locales.en = {
    a: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    A: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    b: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    B: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    c: '%d %b %Y %I:%M %p',
    p: ['AM', 'PM'],
    P: ['am', 'pm'],
    x: '%d %b %Y',
    X: '%I:%M %p'
  };

  locales['en-US'] = util.extend({}, locales.en);
  locales['en-US'].c = '%b %d %Y %I:%M %p';
  locales['en-US'].x = '%b %d %Y';
  locales['en-GB'] = util.extend({}, locales.en);
  locales['en-AU'] = util.extend({}, locales.en);

  ext.formats = {
    a: function(d) { return locales[d.locale].a[d.getDay()]; },
    A: function(d) { return locales[d.locale].A[d.getDay()]; },
    b: function(d) { return locales[d.locale].b[d.getMonth()]; },
    B: function(d) { return locales[d.locale].B[d.getMonth()]; },
    c: 'toLocaleString',
    C: function(d) { return util.xPad(parseInt(d.getFullYear()/100, 10), 0); },
    d: ['getDate', '0'],
    e: ['getDate', ' '],
    g: function(d) { return util.xPad(parseInt(util.G(d)/100, 10), 0); },
    G: function(d) {
        var y = d.getFullYear();
        var V = parseInt(ext.formats.V(d), 10);
        var W = parseInt(ext.formats.W(d), 10);
        if(W > V) {
          y++;
        } else if(W === 0 && V >= 52) {
          y--;
        }
        return y;
      },
    H: ['getHours', '0'],
    I: function(d) { var I=d.getHours()%12; return util.xPad(I===0?12:I, 0); },
    j: function(d) {
        var ms = d - new Date('' + d.getFullYear() + '/1/1 GMT');
        ms += d.getTimezoneOffset()*60000;
        var doy = parseInt(ms/60000/60/24, 10)+1;
        return util.xPad(doy, 0, 100);
      },
    m: function(d) { return util.xPad(d.getMonth()+1, 0); },
    M: ['getMinutes', '0'],
    p: function(d) { return locales[d.locale].p[d.getHours() >= 12 ? 1 : 0 ]; },
    P: function(d) { return locales[d.locale].P[d.getHours() >= 12 ? 1 : 0 ]; },
    S: ['getSeconds', '0'],
    u: function(d) { var dow = d.getDay(); return dow===0?7:dow; },
    U: function(d) {
        var doy = parseInt(ext.formats.j(d), 10);
        var rdow = 6-d.getDay();
        var woy = parseInt((doy+rdow)/7, 10);
        return util.xPad(woy, 0);
      },
    V: function(d) {
        var woy = parseInt(ext.formats.W(d), 10);
        var dow1_1 = (new Date('' + d.getFullYear() + '/1/1')).getDay();
        var idow = woy + (dow1_1 > 4 || dow1_1 <= 1 ? 0 : 1);
        if(idow == 53 && (new Date('' + d.getFullYear() + '/12/31')).getDay() < 4) {
          idow = 1;
        } else
        if(idow === 0) {
          idow = ext.formats.V(new Date('' + (d.getFullYear()-1) + '/12/31'));
        }
        return util.xPad(idow, 0);
      },
    w: 'getDay',
    W: function(d) {
        var doy = parseInt(ext.formats.j(d), 10);
        var rdow = 7-ext.formats.u(d);
        var woy = parseInt((doy+rdow)/7, 10);
        return util.xPad(woy, 0, 10);
      },
    y: function(d) { return util.xPad(d.getFullYear()%100, 0); },
    Y: 'getFullYear',
    z: function(d) {
        var o = d.getTimezoneOffset();
        var H = util.xPad(parseInt(Math.abs(o/60), 10), 0);
        var M = util.xPad(o%60, 0);
        return (o>0?'-':'+') + H + M;
      },
    Z: function(d) { return d.toString().replace(/^.*([A-Z]{3}(?:[+-]\d+)?).*$/, '$1'); },
    '%': function(d) { return '%'; }
  };

  /**
   * List of aggregate format specifiers.
   *
   * Aggregate format specifiers map to a combination of basic format specifiers.
   * These are implemented in terms of ext.formats.
   *
   * A format specifier that maps to 'locale' is read from locales[current-locale].
   */
  ext.aggregates = {
    c: 'locale',
    D: '%m/%d/%y',
    h: '%b',
    n: '\n',
    r: '%I:%M:%S %p',
    R: '%H:%M',
    t: '\t',
    T: '%H:%M:%S',
    x: 'locale',
    X: 'locale'
  };

  // Cache timezone values because they will never change for a given JS instance
  ext.aggregates.z = ext.formats.z(new Date());
  ext.aggregates.Z = ext.formats.Z(new Date());

  /**
   * \brief Formats the date according to the specified format.
   * \param fmt  The format to format the date in.  This may be a combination of the following:
   * \copydoc formats
   *
   * \return  A string representation of the date formatted based on the passed in parameter
   * \sa http://www.php.net/strftime for documentation on format specifiers
  */
  exports.strftime = function(d, fmt, locale) {
    //defaults
    locale = d.locale = (locale && locales[locale]) ? locale : config.locale;
    fmt = fmt ? String(fmt) : locales[locale].c;

    // First replace aggregates
    while (fmt.match(/%[cDhnrRtTxXzZ]/)) {
      fmt = fmt.replace(/%([cDhnrRtTxXzZ])/g, function(m0, m1) {
        var f = ext.aggregates[m1];
        return (f == 'locale' ? locales[d.locale][m1] : f);
      });
    }

    // Now replace formats - we need a closure so that the date object gets passed through
    var str = fmt.replace(/%([aAbBCdegGHIjmMpPSuUVwWyY%])/g, function(m0, m1) {
      var f = ext.formats[m1];
      if (typeof(f) == 'string') {
        return d[f]();
      } else if (typeof(f) == 'function') {
        return f.call(d, d);
      } else if (typeof(f) == 'object' && typeof(f[0]) == 'string') {
        return util.xPad(d[f[0]](), f[1]);
      } else {
        return m1;
      }
    });
    d = null;
    return str;
  };

});