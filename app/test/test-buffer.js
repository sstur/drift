/*global app, define, Buffer */
app.on('ready', function(require) {
  'use strict';

  var buffer = require('buffer');
  if (buffer.nativeImplementation) {
    return;
  }

  var expect = require('expect');

  app.addTestSuite('buffer', {

    Buffer: function(it) {
      it('should be a global', function() {
        expect(buffer.Buffer).to.be(Buffer);
      });
    },

    base64: function(it) {
      var atob = function(str) {
        return new Buffer(str, 'base64').toString('ascii');
      };
      var btoa = function(str) {
        return new Buffer(str, 'ascii').toString('base64');
      };

      it('can encode ASCII input', function() {
        expect(btoa('')).to.be('');
        expect(btoa('f')).to.be('Zg==');
        expect(btoa('fo')).to.be('Zm8=');
        expect(btoa('foo')).to.be('Zm9v');
        expect(btoa('quux')).to.be('cXV1eA==');
        expect(btoa('!"#$%')).to.be('ISIjJCU=');
        expect(btoa("&'()*+")).to.be('JicoKSor');
        expect(btoa(',-./012')).to.be('LC0uLzAxMg==');
        expect(btoa('3456789:')).to.be('MzQ1Njc4OTo=');
        expect(btoa(';<=>?@ABC')).to.be('Ozw9Pj9AQUJD');
        expect(btoa('DEFGHIJKLM')).to.be('REVGR0hJSktMTQ==');
        expect(btoa('NOPQRSTUVWX')).to.be('Tk9QUVJTVFVWV1g=');
        expect(btoa('YZ[\\]^_`abc')).to.be('WVpbXF1eX2BhYmM=');
        expect(btoa('defghijklmnop')).to.be('ZGVmZ2hpamtsbW5vcA==');
        expect(btoa('qrstuvwxyz{|}~')).to.be('cXJzdHV2d3h5ent8fX4=');
      });

      it('cannot encode non-ASCII input', function() {
        expect(function() {
          btoa('✈');
        }).to.throwError();
      });

      it('can decode Base64-encoded input', function() {
        expect(atob('')).to.be('');
        expect(atob('Zg==')).to.be('f');
        expect(atob('Zm8=')).to.be('fo');
        expect(atob('Zm9v')).to.be('foo');
        expect(atob('cXV1eA==')).to.be('quux');
        expect(atob('ISIjJCU=')).to.be('!"#$%');
        expect(atob('JicoKSor')).to.be("&'()*+");
        expect(atob('LC0uLzAxMg==')).to.be(',-./012');
        expect(atob('MzQ1Njc4OTo=')).to.be('3456789:');
        expect(atob('Ozw9Pj9AQUJD')).to.be(';<=>?@ABC');
        expect(atob('REVGR0hJSktMTQ==')).to.be('DEFGHIJKLM');
        expect(atob('Tk9QUVJTVFVWV1g=')).to.be('NOPQRSTUVWX');
        expect(atob('WVpbXF1eX2BhYmM=')).to.be('YZ[\\]^_`abc');
        expect(atob('ZGVmZ2hpamtsbW5vcA==')).to.be('defghijklmnop');
        expect(atob('cXJzdHV2d3h5ent8fX4=')).to.be('qrstuvwxyz{|}~');
      });

      it('cannot decode invalid input', function() {
        expect(function() {
          atob('a');
        }).to.throwError();
      });

      it('should work for special case', function() {
        //strange bug where this would equal 2MQ=VPJb
        expect(new Buffer('d8c40054f25b', 'hex').toString('base64')).to.be('2MQAVPJb');
      });
    }

  });

});
