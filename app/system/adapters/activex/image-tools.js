/*global app, define */
define('image-tools', function(require, exports) {
  "use strict";

  var types = {
    'bmp': 'image/bmp',
    'gif': 'image/gif',
    'jpg': 'image/jpeg',
    'png': 'image/png',
    'tif': 'image/tiff'
  };

  var convertTypes = {
    'bmp': 'png',
    'tif': 'png'
  };

  //todo: change to match w3c terms
  var sizingCodes = {
    cr: 'crop',
    fi: 'fit-inner',
    fo: 'fit-outer'
  };

  function getImageInfo(path, calculateHash) {
    var objUpload = new ActiveXObject('Persits.Upload');
    try {
      var file = objUpload.openFile(app.mappath(path));
    } catch(e) {
      throw new Error('Error opening image: ' + path);
    }
    var type = file.imageType.toLowerCase();
    if (!(type in types)) {
      return null;
    }
    var details = {
      size: file.size,
      type: type,
      mimeType: types[type],
      fileExt: '.' + type,
      width: file.imageWidth,
      height: file.imageHeight
    };
    if (calculateHash) {
      details.md5 = file.md5Hash;
    }
    return details;
  }

  function resizeImageFile(path, opts) {
    var details = getImageInfo(path);
    if (!details) {
      throw new Error('Invalid image at path: ' + path);
    }
    var resize = calculateSize(details, opts);
    if (resize || (details.type in convertTypes)) {
      var outputType = getOutputType(details.type);
      var outpath = opts.outpath || path;
      outpath = (outpath.slice(-4) == '.' + outputType) ? outpath : outpath + '.' + outputType;
      var objJpeg = new ActiveXObject('Persits.Jpeg');
      objJpeg.open(app.mappath(path));
      if (resize) {
        objJpeg.width = resize.width;
        objJpeg.height = resize.height;
      }
      var crop = opts.crop || (resize && resize.crop);
      if (crop) {
        objJpeg.canvas.brush.color = 0xFFFFFF;
        objJpeg.crop(crop[0], crop[1], crop[2], crop[3]);
      }
      objJpeg.interpolation = 1;
      if (outputType == 'png') {
        objJpeg.pngOutput = true;
      }
      if (outputType == 'jpg') {
        objJpeg.quality = opts.quality || 90;
      }
      try {
        objJpeg.save(app.mappath(outpath));
      } catch(e) {
        throw new Error('Cannot save to path: ' + outpath);
      }
      objJpeg.close();
      return outpath;
    }
    return false;
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

  exports.getImageInfo = getImageInfo;
  exports.resizeImageFile = resizeImageFile;
  exports.getSizing = getSizing;
  exports.calculateSize = calculateSize;
  exports.sizeToFit = sizeToFit;
  exports.sizeToFitOuter = sizeToFitOuter;
  exports.cropToSize = cropToSize;
  exports.getOutputType = getOutputType;

});