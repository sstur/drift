const crypto = require('crypto');

module.exports = {
  createHash: crypto.createHash.bind(crypto),
  hash: function(type, data, enc) {
    let hasher = crypto.createHash(type);
    hasher.update(data, enc);
    return hasher.digest();
  },
  createHmac: crypto.createHmac.bind(crypto),
  hmac: function(type, key, data, enc) {
    let hasher = crypto.createHmac(type, key, enc);
    hasher.update(data, enc);
    return hasher.digest();
  },
};
