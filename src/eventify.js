const emitter = {
  on: function(name, fn) {
    let events = this._events || (this._events = {});
    let list = events[name] || (events[name] = []);
    list.push(fn);
  },
  emit: function(name, ...args) {
    let events = this._events || {};
    let list = events[name] || [];
    for (let fn of list) {
      fn.call(this, ...args);
    }
  },
};

// Make an object into a basic Event Emitter
exports.eventify = function(obj) {
  obj.on = emitter.on;
  obj.emit = emitter.emit;
  return obj;
};
