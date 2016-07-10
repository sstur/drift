/*global app, adapter */
var _fs = require('fs');
var gm = require('gm');
var crypto = require('crypto');
adapter.define('image-tools', function(require, exports) {
  'use strict';

  //todo: this should be set in app.cfg() or pkgConfig
  var PATH_TO_GM = '/usr/local/bin/';

  //file ext to mime-type
  /* eslint-disable quote-props */
  var types = {
    'bmp': 'image/bmp',
    'gif': 'image/gif',
    'jpg': 'image/jpeg',
    'png': 'image/png',
    'tif': 'image/tiff'
  };

  //map format returned by gm/imagemagick to file type
  var formatMap = {
    'jpeg': 'jpg',
    'tiff': 'tif'
  };

  var convertTypes = {
    'bmp': 'png',
    'tif': 'png'
  };
  /* eslint-enable quote-props */

  //todo: change to match w3c terms
  var sizingCodes = {
    cr: 'crop',
    fi: 'fit-inner',
    fo: 'fit-outer'
  };

  function getImageInfo(path, calculateHash, callback) {
    _fs.stat(path, function(err, stat) {
      if (err) return callback(err);
      //if (!stat.isFile()) return fs.getError('ENOENT', path);
      var objImage = gm(app.mappath(path));
      objImage.options({appPath: PATH_TO_GM});
      objImage.identify(function(err, file) {
        if (err) {
          console.log('Error opening image: ' + path);
          //or use 'No decode delegate for this image'
          if (~err.message.indexOf('Request did not return an image')) {
            return callback(null, null);
          }
          return callback(err);
        }
        var type = (file.format || '').toLowerCase();
        type = formatMap[type] || type;
        if (!(type in types)) {
          return callback(null, null);
        }
        var details = {
          size: stat.size,
          type: type,
          mimeType: types[type],
          fileExt: '.' + type,
          width: file.size.width,
          height: file.size.height
        };
        if (calculateHash) {
          getHash(path, 'md5', function(err, hash) {
            if (hash) details.md5 = hash;
            callback(err, details);
          });
        } else {
          callback(null, details);
        }
      });
    });
  }

  function resizeImageFile(path, opts, callback) {
    getImageInfo(path, false, function(err, details) {
      if (err) return callback(err);
      if (!details) {
        throw new Error('Invalid image at path: ' + path);
      }
      var resize = calculateSize(details, opts);
      if (!resize && !(details.type in convertTypes)) {
        return callback(null, false);
      }
      var objImage = gm(app.mappath(path));
      objImage.options({appPath: PATH_TO_GM});
      objImage.noProfile();
      if (resize) {
        objImage.resize(resize.width, resize.height, '!'); //the ! ignores aspect ratio
      }
      var crop = opts.crop || (resize && resize.crop);
      if (crop) {
        objImage.crop(crop[0], crop[1], crop[2] - crop[0], crop[3] - crop[1]);
      }
      var outputType = getOutputType(details.type);
      var outpath = opts.outpath || path;
      outpath = (outpath.slice(-4) === '.' + outputType) ? outpath : outpath + '.' + outputType;
      if (outputType == 'jpg') {
        objImage.quality(opts.quality || 90);
      }
      var writeStream = _fs.createWriteStream(app.mappath(outpath));
      writeStream.on('error', function(err) {
        return callback(err);
      });
      writeStream.on('open', function() {
        var readStream = objImage.stream(outputType);
        readStream.on('error', function(err) {
          //new Error('Cannot save to path: ' + outpath);
          callback(err);
        });
        readStream.on('end', function() {
          callback(null, outpath);
        });
        readStream.pipe(writeStream);
      });
    });
  }

  function getSizing(code) {
    var sizing = (typeof code === 'string') ? code : '';
    if (sizing in sizingCodes) {
      sizing = sizingCodes[sizing];
    }
    return sizing || 'crop';
  }

  function calculateSize(src, opts) {
    var sizing = opts.sizing || '';
    var resize = (sizing == 'crop' || sizing == 'fit-outer') ? sizeToFitOuter(src, opts) : sizeToFit(src, opts);
    if (resize && sizing == 'crop') {
      var crop = cropToSize(resize, {width: opts.maxWidth, height: opts.maxHeight});
      if (crop) resize.crop = crop;
    }
    if (resize) {
      //final size after resize and crop
      resize.finalWidth = resize.crop ? opts.maxWidth : resize.width;
      resize.finalHeight = resize.crop ? opts.maxHeight : resize.height;
    }
    return resize;
  }

  function sizeToFit(src, opts) {
    var size;
    if (src.width > opts.maxWidth || src.height > opts.maxHeight) {
      if (opts.maxWidth / opts.maxHeight < src.width / src.height) {
        size = {width: opts.maxWidth, height: Math.round(src.height * opts.maxWidth / src.width)};
      } else {
        size = {width: Math.round(src.width * opts.maxHeight / src.height), height: opts.maxHeight};
      }
    }
    return size;
  }

  function sizeToFitOuter(src, opts) {
    var size;
    if (opts.maxWidth / opts.maxHeight > src.width / src.height) {
      size = {width: opts.maxWidth, height: Math.round(src.height * opts.maxWidth / src.width)};
    } else {
      size = {width: Math.round(src.width * opts.maxHeight / src.height), height: opts.maxHeight};
    }
    return size;
  }

  function cropToSize(src, opts) {
    var crop;
    if (src.width > opts.width || src.height > opts.height) {
      crop = [Math.round((src.width - opts.width) / 2), Math.round((src.height - opts.height) / 2)];
      crop = [crop[0], crop[1], opts.width + crop[0], opts.height + crop[1]];
    }
    return crop;
  }

  function getOutputType(type) {
    return convertTypes[type] || type;
  }

  function getHash(path, type, callback) {
    var readStream = _fs.createReadStream(path);
    readStream.on('error', function(err) {
      callback(err);
    });
    var hash = crypto.createHash(type);
    readStream.on('data', function(data) {
      hash.update(data);
    });
    readStream.on('end', function() {
      callback(hash.digest('hex'));
    });
  }

  exports.getImageInfo_ = getImageInfo;
  exports.resizeImageFile_ = resizeImageFile;
  exports.getSizing = getSizing;
  exports.calculateSize = calculateSize;
  exports.sizeToFit = sizeToFit;
  exports.sizeToFitOuter = sizeToFitOuter;
  exports.cropToSize = cropToSize;
  exports.getOutputType = getOutputType;
});
