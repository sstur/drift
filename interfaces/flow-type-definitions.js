/* @flow */

type AnyMap = {[key: string]: any};
type StringMap = {[key: string]: string};
type StringMapArr = {[key: string]: string | Array<string>};

type RouteHandler = (...args: Array<any>) => void;
type GenericIterator = () => any;

type ReadStream = {
  on: () => void;
  emit: () => void;
};

type WriteStream = {
  write: (data: any) => void;
  end: () => void;
};

type CryptoHash = {
  write:
    ((data: string, enc: ?string) => CryptoHash) &
    ((data: Buffer) => CryptoHash);
  digest: ((enc: string) => string) & (() => Buffer);
};

type App = {
  define: () => void;
  require: () => void;
  platforms: {[key: string]: number};
  mappath: (path: string) => string;
  data: ((n: string, val: any) => void) & ((n: string) => string);
  eventify: (obj: Object) => Object;
  route:
    ((route: string | RegExp, handler: RouteHandler, opts: ?AnyMap) => void) &
    ((adapterRequest: Object, adapterResponse: Object) => void);
  cfg:
    ((path: string) => string) &
    ((path: string, value: string | number | boolean) => void) &
    ((data: Object) => void) &
    ((platform: string, data: Object) => void);
  on: () => void;
  emit: () => void;
};

type ParsedURL = {
  protocol: string;
  hostname: string;
  port: string;
  pathname: string;
  search: string;
  port: string;
  host: string;
  path: string;
};

type FSFileInfo = {
  name: string;
  dateCreated: Date;
  dateLastAccessed: Date;
  dateLastModified: Date;
  type: 'directory' | 'file';
  size: number;
  children: ?Array<FSFileInfo>;
};
type FSWriteFileOptions = {
  append: ?boolean;
  overwrite: ?boolean;
  encoding: ?string;
};
type FSReadFileOptions = {
  encoding: ?string;
  chunkSize: ?number;
};
type FSWalkIterator = (info: FSFileInfo, prefix: string) => any;

declare var app: App;
declare var forEach: (
  obj: AnyMap,
  fn: GenericIterator,
  context: ?Object
) => void;
declare var vartype: (obj: any, list: string | Array<string>) => string;
declare var isPrimitive: (obj: any) => boolean;
declare var toArray: (arrayLike: any) => Array<any>;

declare class SimpleEventEmitter {
  on: () => void;
  emit: () => void;
}

declare class ServerRequest extends SimpleEventEmitter {
  constructor(rawRequest: Object): ServerRequest;
  url: (part: ?string) => string;
  method: (s: ?string) => string;
  getRemoteIP: () => string;
  headers: (() => StringMap) & ((n: string) => string);
  cookies: (() => StringMap) & ((n: string) => string);
  query: ((n: string) => string) & (() => StringMap);
  body: (() => AnyMap) & ((n: string) => ?any);
  isUpload: (item: any) => boolean;
  isAjax: () => boolean;
}

declare class ServerResponse {
  constructor(rawResponse: Object): ServerResponse;
  clear: (type: string, status: string) => void;
  status: (() => string) & ((status: string) => void);
  charset: (charset: ?string) => string;
  headers:
    (() => StringMap) &
    ((headers: StringMap) => ServerResponse) &
    ((name: string) => ?string) &
    ((name: string, value: any) => ServerResponse);
  write: (data: any) => void;
  contentType: (type: string) => void;
  cookies:
    (() => StringMap) &
    ((cookies: StringMap) => ServerResponse) &
    ((name: string) => ?string) &
    ((name: string, value: any) => ServerResponse);
  end: (...args: Array<any>) => void;
  die: (...args: Array<any>) => void;
  getWriteStream: () => WriteStream;
  sendFile: (opts: AnyMap) => void;
  redirect: (url: string, type: ?string) => void;
  htmlRedirect: (url: string) => void;
}

declare class ClientRequest {
  constructor(opts: AnyMap): ClientRequest;
  addHeader: (n: string, val: string) => void;
  getFullUrl: () => string;
  generateHost: () => string;
  send: () => ClientResponse;
}

declare class ClientResponse {
  constructor(rawResponse: Object): ClientResponse;
  statusCode: number;
  statusReason: string;
  status: string;
  headers: StringMap;
  body: Buffer;
  getHeader: (name: string) => ?string;
  getHeaders: () => StringMap;
}

declare class FSFileReadStream extends SimpleEventEmitter {
  constructor(file: string, opts: ?FSReadFileOptions): FSFileReadStream;
  setEncoding: (enc: string) => void;
  readBytes: (bytes: number) => string | Buffer;
  readAll: () => string | Buffer;
  size: () => number;
  read: () => void;
}

declare class FSTextReadStream extends SimpleEventEmitter {
  constructor(file: string, opts: ?FSReadFileOptions): FSTextReadStream;
  setEncoding: (enc: string) => void;
  readAll: () => string;
  size: () => number;
  read: () => void;
}

declare class FSFileWriteStream extends SimpleEventEmitter {
  constructor(file: string, opts: ?FSReadFileOptions): FSFileWriteStream;
  setEncoding: (enc: string) => void;
  write: ((data: string, enc: string) => void) & ((data: Buffer) => void);
  end: () => void;
}

declare module 'crypto' {
  declare var createHash: (type: string) => CryptoHash;
  declare var createHmac: (type: string) => CryptoHash;
  declare var hash: (
    type: string,
    data: string | Buffer,
    enc: ?string
  ) => string | Buffer;
  declare var hmac: (
    type: string,
    key: string | Buffer,
    data: string | Buffer,
    enc: ?string
  ) => string | Buffer;
}

declare module 'fs' {
  declare var isFile: (path: string) => boolean;
  declare var isDir: (path: string) => boolean;
  declare var copyFile: (src: string, dest: string) => void;
  declare var moveFile: (src: string, dest: string) => void;
  declare var deleteFile: (path: string, opts: ?{ifExists: boolean}) => void;
  declare var deleteFileIfExists: (path: string) => void;
  declare var createDir: (path: string, opts: ?{deep: boolean}) => void;
  declare var removeDir: (path: string, opts: ?{ifExists: boolean}) => void;
  declare var removeDirIfExists: (path: string) => void;
  declare var moveDir: (src: string, dest: string) => void;
  declare var getDirContents: (path: string) => Array<string>;
  declare var walk: (path: string, fn: FSWalkIterator) => void;
  declare var getInfo: (path: string, deep: ?boolean) => FSFileInfo;
  declare var getFileInfo: (path: string) => FSFileInfo;
  declare var readFile: (file: string) => Buffer;
  declare var readTextFile: (file: string, enc: ?string) => string;
  declare var writeFile: (
    file: string,
    data: string | Buffer,
    opts: FSWriteFileOptions
  ) => void;
  declare var writeTextToFile: (
    file: string,
    data: string,
    opts: FSWriteFileOptions
  ) => void;
  declare var createReadStream: (
    file: string,
    opts: ?FSReadFileOptions
  ) => FSTextReadStream | FSFileReadStream;
  declare var createWriteStream: (
    file: string,
    opts: FSWriteFileOptions
  ) => FSFileWriteStream;
}

declare module 'http' {
  declare var ClientRequest: typeof ClientRequest;
  declare var ClientResponse: typeof ClientResponse;
  declare var request: (opts: AnyMap) => ClientResponse;
  declare var get: (opts: AnyMap) => ClientResponse;
  declare var post: (opts: AnyMap) => ClientResponse;
}

declare module 'path' {
  declare var join: (...args: Array<string>) => string;
  declare var normalize: (path: string) => string;
  declare var dirname: (path: string) => string;
  declare var basename: (path: string) => string;
}

declare module 'qs' {
  declare var escape: (s: string) => string;
  declare var encode: (s: string) => string; //alias of escape
  declare var unescape: (s: string) => string;
  declare var decode: (s: string) => string; //alias of unescape
  declare var stringify: (obj: StringMapArr) => string;
  declare var parse: (str: string, opts: AnyMap) => string;
  declare var flatten: (obj: StringMapArr) => StringMap;
}

declare module 'url' {
  declare var parse: (url: string) => ParsedURL;
  declare var resolve: (oldUrl: string, newUrl: string) => string;
  declare var normalize: (url: string) => string;
}

declare module 'util' {
  declare var extend: (...objects: Array<Object>) => Object;
  declare var clone: <T>(obj: T) => T;
  declare var inherits: (ctor: Function, parent: Function) => void;
  declare var propagateEvents: (
    src: SimpleEventEmitter,
    dest: SimpleEventEmitter,
    events: string | Array<string>
  ) => void;
  declare var pipe: (src: ReadStream, dst: WriteStream) => void;
  declare var getUniqueHex: (numBytes: ?number) => string;
  declare var hexBytes: (numBytes: ?number) => string;
  declare var getSeed: () => number;
  declare var log: (...args: Array<any>) => void;
  declare var parseHeaders: (input: string) => StringMap;
  declare var parseHeaderValue: (str: string) => StringMap;
  declare var stripFilename: (
    filename: string,
    ch: ?string,
    map: ?StringMap
  ) => string;
  declare var htmlEnc: (str: string, isAttr: ?boolean) => string;
  declare var htmlDec: (str: string) => string;
  declare var stringify: (obj: any, opts: ?StringMap) => string;
  declare var parse: (str: string) => any;
}
