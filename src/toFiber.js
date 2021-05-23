const Fiber = require('./lib/fiber');

exports.toFiber = (fn) => {
  return Fiber.fiberize(fn);
};
