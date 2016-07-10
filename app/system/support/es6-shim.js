(function() {

  if (!Object.assign) {
    Object.assign = function() {
      var target = arguments[0];
      if (target == null) {
        var type = (target === null) ? 'null' : 'undefined';
        throw new Error('Cannot convert ' + type + ' to object');
      }
      for (var i = 1, len = arguments.length; i < len; i++) {
        var source = arguments[i];
        if (source == null) continue;
        source = Object(source);
        var keys = Object.keys(source);
        for (var j = 0, l = keys.length; j < l; j++) {
          var key = keys[j];
          target[key] = source[key];
        }
      }
      return target;
    };
  }

  if (!Array.from) {
    Array.from = function(object, fn, context) {
      if (object == null) {
        var type = (object === null) ? 'null' : 'undefined';
        throw new Error('Cannot convert ' + type + ' to object');
      }
      object = Object(object);
      var length = object.length | 0;
      var array = new Array(length);
      if (typeof fn === 'function') {
        fn = (context === undefined) ? fn : fn.bind(context);
        for (var i = 0; i < length; i++) {
          array[i] = fn(object[i], i);
        }
      } else {
        for (i = 0; i < length; i++) {
          array[i] = object[i];
        }
      }
      return array;
    };
  }

})();
