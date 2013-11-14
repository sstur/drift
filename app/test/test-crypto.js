/*global app, define */
app.on('ready', function(require) {
  "use strict";

  var crypto = require('crypto');
  var expect = require('expect');

  var hash, result, key, keyBuffer;

  app.addTestSuite('crypto', {
    'md5': function() {
      hash = crypto.createHash('md5');
      hash.update('hello', 'utf8');
      result = hash.digest('hex');
      expect(result).to.be('5d41402abc4b2a76b9719d911017c592');
    },
    'md5 shorthand': function() {
      result = crypto.hash('md5', 'hello', 'utf8').toString('hex');
      expect(result).to.be('5d41402abc4b2a76b9719d911017c592');
    },
    'md5 mixed input encoding': function() {
      hash = crypto.createHash('md5');
      hash.update('test1', 'utf8');
      hash.update('fb0a30e26e83b2ac5b9e29', 'hex');
      result = hash.digest('hex');
      expect(result).to.be('d14b690f60f217b05e9f3206916a0da3');
    },
    'md5 hmac': function() {
      key = 'd14b690f60f217b05e9f3206916a0da3';
      keyBuffer = new Buffer(key, 'hex');
      hash = crypto.createHmac('md5', keyBuffer);
      hash.update('hello', 'utf8');
      result = hash.digest('hex');
      expect(result).to.be('d54d0414c3e8460933cb6f9b082a38ac');
    },
    'md5 hmac shorthand': function() {
      result = crypto.hmac('md5', keyBuffer, 'hello', 'utf8').toString('hex');
      expect(result).to.be('d54d0414c3e8460933cb6f9b082a38ac');
    },
    'sha256': function() {
      hash = crypto.createHash('sha256');
      hash.update('hello', 'utf8');
      result = hash.digest('hex');
      expect(result).to.be('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
    },
    'sha256 shorthand': function() {
      result = crypto.hash('sha256', 'hello', 'utf8').toString('hex');
      expect(result).to.be('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
    },
    'sha256 mixed input encoding': function() {
      hash = crypto.createHash('sha256');
      hash.update('test1', 'utf8');
      hash.update('fb0a30e26e83b2ac5b9e29', 'hex');
      result = hash.digest('hex');
      expect(result).to.be('52c5a731acf66baf41bdd1cae3260c54566a73635b0559f5395a8ed5556e8e70');
    },
    'sha256 hmac': function() {
      key = '52c5a731acf66baf41bdd1cae3260c54566a73635b0559f5395a8ed5556e8e70';
      keyBuffer = new Buffer(key, 'hex');
      hash = crypto.createHmac('sha256', keyBuffer);
      hash.update('hello', 'utf8');
      result = hash.digest('hex');
      expect(result).to.be('139f345d99f13d65645709b5d93965ef99a161530361d42a907cfb5332002440');
    },
    'sha256 hmac shorthand': function() {
      result = crypto.hmac('sha256', keyBuffer, 'hello', 'utf8').toString('hex');
      expect(result).to.be('139f345d99f13d65645709b5d93965ef99a161530361d42a907cfb5332002440');
    }
  });

});