/*!
 * todo: writeTextFile {overwrite: true}
 */
/*global app, define */
app.on('ready', function(require) {
  "use strict";

  var fs = require('fs');
  var expect = require('expect');

  var dataPath = app.cfg('data_dir') || 'data/';
  //create a text blob that's > 1kb to ensure there's multiple chunks
  var textBlob = [];
  for (var i = 0; i < 500; i++) textBlob.push(i);
  textBlob = textBlob.join('|');

  app.addTestSuite('fs', {
    //noCatch: true,
    'createDir': function(it) {
      it('should create in existing', function() {
        var path = dataPath + 'test';
        fs.removeDirIfExists(path);
        fs.createDir(path);
        var stat = fs.stat(path);
        expect(stat.type).to.be('directory');
      });
      fs.removeDirIfExists(dataPath + 'test2');
      it('should throw if parent not exist', function() {
        var path = dataPath + 'test2/test3';
        expect(function() {
          fs.createDir(path);
        }).to.throwError(/ENOENT/);
      });
      it('should create multi-level', function() {
        var path = dataPath + 'test2/test3';
        fs.createDir(path, {deep: true});
        var stat = fs.stat(path);
        expect(stat.type).to.be('directory');
      });
    },
    'removeDir': function(it) {
      it('should remove simple', function() {
        var path = dataPath + 'test';
        fs.removeDir(path);
      });
      it('should remove with contents', function() {
        var path = dataPath + 'test2/test3';
        fs.writeTextToFile(path + '/file.txt', 'abc');
        fs.removeDir(path);
      });
      it('should be gone', function() {
        var path = dataPath + 'test';
        expect(function() {
          fs.stat(path);
        }).to.throwError(/ENOENT/);
      });
      it('should throw if not exists', function() {
        var path = dataPath + 'test';
        expect(function() {
          fs.removeDir(path);
        }).to.throwError(/ENOENT/);
      });
    },
    'ReadStream': function(it) {
      var path = dataPath + 'test';
      fs.createDir(path);
      var file = path + '/file.txt';
      fs.writeTextToFile(file, textBlob, {overwrite: true});
      it('should read file in chunks (text)', function() {
        var readStream = fs.createReadStream(file, {encoding: 'utf8'});
        var chunks = [];
        readStream.on('data', function(data) {
          expect(data).to.be.a('string');
          chunks.push(data);
        });
        readStream.on('end', function() {
          chunks = chunks.join('');
        });
        readStream.read();
        expect(chunks).to.be.a('string');
        expect(chunks).to.be(textBlob);
      });
      it('should readAll (text)', function() {
        var readStream = fs.createReadStream(file, {encoding: 'utf8'});
        var text = readStream.readAll();
        expect(text).to.be.a('string');
        expect(text).to.be(textBlob);
      });
      it('should read file in chunks', function() {
        var readStream = fs.createReadStream(file);
        var chunks = [];
        readStream.on('data', function(data) {
          expect(data).to.be.a(Buffer);
          chunks.push(data.toString());
        });
        readStream.on('end', function() {
          chunks = chunks.join('');
        });
        readStream.read();
        expect(chunks).to.be.a('string');
        expect(chunks).to.be(textBlob);
      });
      it('should readAll', function() {
        var readStream = fs.createReadStream(file);
        var data = readStream.readAll();
        expect(data).to.be.a(Buffer);
        expect(data.toString()).to.be(textBlob);
      });
      fs.deleteFile(file);
      it('should throw if file not exists', function() {
        expect(function() {
          fs.createReadStream(file);
        }).to.throwError(/ENOENT/);
      });
      fs.removeDir(path);
      it('should throw if folder not exists', function() {
        expect(function() {
          fs.createReadStream(file);
        }).to.throwError(/ENOENT/);
      });
    },
    'WriteStream': function(it) {
      var path = dataPath + 'test';
      fs.createDir(path);
      var file = path + '/file.txt';
      it('should write utf8 by default', function() {
        var writeStream = fs.createWriteStream(file);
        writeStream.write('Ω');
        writeStream.write(new Buffer('Ω'));
        writeStream.end();
        var data = fs.readTextFile(file);
        expect(data).to.be.a('string');
        expect(data).to.be('ΩΩ');
      });
      it('should append chunks', function() {
        var writeStream = fs.createWriteStream(file);
        for (var i = 0; i < 499; i++) {
          writeStream.write(i + '|');
        }
        writeStream.write(new Buffer('499'));
        writeStream.end();
        var data = fs.readTextFile(file);
        expect(data).to.be('ΩΩ' + textBlob);
      });
      it('should overwrite when specified', function() {
        var writeStream = fs.createWriteStream(file, {overwrite: true});
        writeStream.write('abc');
        writeStream.end();
        var data = fs.readTextFile(file);
        expect(data).to.be('abc');
      });
      it('should overwrite when append is false', function() {
        var writeStream = fs.createWriteStream(file, {append: false});
        writeStream.write('ü');
        writeStream.end();
        var data = fs.readTextFile(file);
        expect(data).to.be('ü');
      });
    },
    'moveFile': function(it) {
      it('should rename file', function() {
        fs.moveFile(dataPath + 'test/file.txt', dataPath + 'test/file2.txt');
      });
      fs.removeDir(dataPath + 'test2');
      fs.createDir(dataPath + 'test2');
      it('should move file if destination is directory', function() {
        fs.moveFile(dataPath + 'test/file2.txt', dataPath + 'test2');
      });
      it('should move and rename', function() {
        fs.moveFile(dataPath + 'test2/file2.txt', dataPath + 'test/file.txt');
      });
      it('should throw when source file not exist', function() {
        expect(function() {
          fs.moveFile(dataPath + 'test2/file2.txt', dataPath + 'test');
        }).to.throwError(/ENOENT/);
      });
      it('should throw when source path not exist', function() {
        expect(function() {
          fs.moveFile(dataPath + 'test3/file.txt', dataPath + 'test');
        }).to.throwError(/ENOENT/);
      });
      it('should throw when destination path not exist', function() {
        expect(function() {
          fs.moveFile(dataPath + 'test/file.txt', dataPath + 'test3/file');
        }.bind(this)).to.throwError(/ENOENT/);
      });
      fs.removeDir(dataPath + 'test');
      fs.removeDir(dataPath + 'test2');
    },
    'copyFile': function(it) {
    },
    'deleteFile': function(it) {
    },
    'deleteFileIfExists': function(it) {
    },
    'readdir': function(it) {
    },
    'walk': function(it) {
    },
    'stat': function(it) {
    },
    'readTextFile': function(it) {
    },
    'writeTextToFile': function(it) {
    }
  });

});