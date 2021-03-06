/* eslint-disable quote-props */
var extensions = {
  '3gp': 'video/3gpp',
  '7z': 'application/x-7z-compressed',
  ace: 'application/x-ace-compressed',
  ai: 'application/postscript',
  aif: 'audio/x-aiff',
  aiff: 'audio/x-aiff',
  appcache: 'text/cache-manifest',
  asx: 'video/x-ms-asf',
  asf: 'video/x-ms-asf',
  au: 'audio/basic',
  avi: 'video/x-msvideo',
  bin: 'application/octet-stream',
  bmp: 'image/bmp',
  bz2: 'application/x-bzip2',
  cab: 'application/vnd.ms-cab-compressed',
  cbr: 'application/x-cbr',
  chm: 'application/vnd.ms-htmlhelp',
  css: 'text/css',
  dmg: 'application/x-apple-diskimage',
  doc: 'application/msword',
  docx:
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  dotx:
    'application/vnd.openxmlformats-officedocument.wordprocessingml.template',
  dtd: 'application/xml-dtd',
  dwg: 'image/vnd.dwg',
  eml: 'message/rfc822',
  eot: 'application/vnd.ms-fontobject',
  eps: 'application/postscript',
  flv: 'video/x-flv',
  gif: 'image/gif',
  hqx: 'application/mac-binhex40',
  htm: 'text/html',
  html: 'text/html',
  ico: 'image/x-icon',
  iso: 'application/x-iso9660-image',
  jar: 'application/java-archive',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  js: 'application/javascript',
  json: 'application/javascript',
  lnk: 'application/x-ms-shortcut',
  log: 'text/plain',
  m4a: 'audio/mp4',
  m4p: 'application/mp4',
  m4v: 'video/x-m4v',
  map: 'application/json',
  mcd: 'application/vnd.mcd',
  mdb: 'application/x-msaccess',
  mid: 'audio/midi',
  midi: 'audio/midi',
  mov: 'video/quicktime',
  mp3: 'audio/mpeg',
  mp4: 'video/mp4',
  mpeg: 'video/mpeg',
  mpg: 'video/mpeg',
  ogg: 'audio/ogg',
  otf: 'font/opentype',
  pdf: 'application/pdf',
  png: 'image/png',
  potx: 'application/vnd.openxmlformats-officedocument.presentationml.template',
  pps: 'application/vnd.ms-powerpoint',
  ppsx:
    'application/vnd.openxmlformats-officedocument.presentationml.slideshow',
  ppt: 'application/vnd.ms-powerpoint',
  pptx:
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ps: 'application/postscript',
  psd: 'image/vnd.adobe.photoshop',
  pub: 'application/x-mspublisher',
  qxd: 'application/vnd.quark.quarkxpress',
  ra: 'audio/x-pn-realaudio',
  ram: 'audio/x-pn-realaudio',
  rar: 'application/x-rar-compressed',
  rdf: 'application/rdf+xml',
  rm: 'application/vnd.rn-realmedia',
  rmvb: 'application/vnd.rn-realmedia-vbr',
  rtf: 'application/rtf',
  sass: 'text/plain',
  scss: 'text/plain',
  sgml: 'text/sgml',
  sit: 'application/x-stuffit',
  sitx: 'application/x-stuffitx',
  sldx: 'application/vnd.openxmlformats-officedocument.presentationml.slide',
  svg: 'image/svg+xml',
  swf: 'application/x-shockwave-flash',
  tar: 'application/x-tar',
  tiff: 'image/tiff',
  tif: 'image/tiff',
  torrent: 'application/x-bittorrent',
  tsv: 'text/tab-separated-values',
  ttf: 'application/x-font-ttf',
  txt: 'text/plain',
  vcd: 'application/x-cdlink',
  wav: 'audio/x-wav',
  wma: 'audio/x-ms-wma',
  wmv: 'video/x-ms-wmv',
  woff: 'application/font-woff',
  woff2: 'application/font-woff2',
  wpd: 'application/vnd.wordperfect',
  wps: 'application/vnd.ms-works',
  xlam: 'application/vnd.ms-excel.addin.macroenabled.12',
  xls: 'application/vnd.ms-excel',
  xlsb: 'application/vnd.ms-excel.sheet.binary.macroenabled.12',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xltx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.template',
  xml: 'application/xml',
  zip: 'application/zip',
};

var types = Object.keys(extensions).reduce(function(types, key) {
  if (!types[key]) {
    types[key] = [];
  }
  types[key].push(extensions[key]);
  return types;
}, {});

exports.getExtension = function getExtension(type) {
  return types[type] && types[type][0];
};

exports.getMime = function getMime(path) {
  path = path.toLowerCase().trim();
  var index = path.lastIndexOf('/');
  if (index >= 0) {
    path = path.substr(index + 1);
  }
  index = path.lastIndexOf('.');
  if (index >= 0) {
    path = path.substr(index + 1);
  }
  return extensions[path];
};
