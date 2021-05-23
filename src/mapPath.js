const { join } = require('path');

const { BASE_PATH } = require('./constants');

exports.mapPath = (...args) => {
  return join(BASE_PATH, ...args);
};
