/* @flow */
/*eslint-disable no-unused-vars */

type AnyMap = {[key: string]: any};
type StringMap = {[key: string]: string};
type StringMapArr = {[key: string]: string | Array<string>};

type RouteHandler = (...args: Array<any>) => void;
type GenericIterator = () => any;

type EventEmitter = {
  on: () => void;
  emit: () => void;
};

type ReadStream = EventEmitter;

type WriteStream = {
  write: (data: any) => void;
  end: () => void;
};

type CryptoHash = {
  write: (data: string | Buffer, enc: ?string) => CryptoHash;
  digest: (enc: ?string) => string | Buffer;
};

type App = {
  define: () => void;
  require: () => void;
  platforms: {[key: string]: number};
  eventify: (obj: Object) => Object;
  route:
    ((route: string | RegExp, handler: RouteHandler, opts: ?AnyMap) => void) &
    ((adapterRequest: Object, adapterResponse: Object) => void);
  cfg:
    ((path: string) => string) &
    ((path: string, value: string | number | boolean) => void) &
    ((data: Object) => void) &
    ((platform: string, data: Object) => void);
  addController: (name: string, config: AnyMap) => void;
  getController: (name: string) => Controller;
  addModel: (name: string, config: AnyMap) => void;
  getModel: (name: string) => Model;
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

type Model = {
  // todo
  create: () => void;
  insert: () => void;
  updateWhere: () => void;
  destroyWhere: () => void;
  find: () => void;
  findAll: () => void;
  count: () => void;
  join: () => void;
  createTable: () => void;
  dropTable: () => void;
};

type Controller = {
  request: ServerRequest;
  response: ServerResponse;
  params: AnyMap;
};

declare var app: App;
declare var forEach: (obj: AnyMap, fn: GenericIterator, context: ?Object) => void;
declare var vartype: (obj: any, list: string | Array<string>) => string;
declare var isPrimitive: (obj: any) => boolean;
declare var toArray: (obj: any) => Array<any>;

declare class ServerRequest {
  url: (part: ?string) => string;
  method: (s: ?string) => string;
  getRemoteIP: () => string;
  headers: (() => StringMap) & ((n: string) => string);
  cookies: (() => StringMap) & ((n: string) => string);
  query: ((n: string) => string) & (() => StringMap);
  body: (() => AnyMap) & ((n: string) => ?any);
  isUpload: (item: any) => boolean;
  isAjax: () => boolean;
  on: () => void;
  emit: () => void;
}

declare class ServerResponse {
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
  debug: (data: any) => void;
  getWriteStream: () => WriteStream;
  sendFile: (opts: AnyMap) => void;
  redirect: (url: string, type: ?string) => void;
  htmlRedirect: (url: string) => void;
}

declare class ClientRequest {

}

declare class ClientResponse {

}

declare module 'crypto' {
  declare var createHash: (type: string) => CryptoHash;
  declare var createHmac: (type: string) => CryptoHash;
  declare var hash: (type: string, data: string | Buffer, enc: ?string) => string | Buffer;
  declare var hmac: (type: string, key: string | Buffer, data: string | Buffer, enc: ?string) => string | Buffer;
}

declare module 'debug' {
  declare var stackTrace: (fn: ?Function) => string;
}

declare module 'email' {
  declare var isEmail: (str: string) => boolean;
  declare var sendEmail: (opts: StringMap) => void;
}

declare module 'fs' {
}

declare module 'http' {
  declare var ClientRequest: typeof ClientRequest;
  declare var ClientResponse: typeof ClientResponse;
  declare var request: (opts: AnyMap) => ClientResponse;
  declare var get: (opts: AnyMap) => ClientResponse;
  declare var post: (opts: AnyMap) => ClientResponse;
}

declare module 'image-tools' {
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
  declare var inspect: (...args: Array<any>) => string;
  declare var extend: (...objects: Array<Object>) => Object;
  declare var clone: <T>(obj: T) => T;
  declare var inherits: (ctor: Function, parent: Function) => void;
  declare var propagateEvents: (src: EventEmitter, dest: EventEmitter, events: string | Array<string>) => void;
  declare var pipe: (src: ReadStream, dst: WriteStream) => void;
  declare var getUniqueHex: (numBytes: ?number) => string;
  declare var hexBytes: (numBytes: ?number) => string;
  declare var getSeed: () => number;
  declare var log: (...args: Array<any>) => void;
  declare var parseHeaders: (input: string) => StringMap;
  declare var parseHeaderValue: (str: string) => StringMap;
  declare var stripFilename: (filename: string, ch: ?string, map: ?StringMap) => string;
  declare var htmlEnc: (str: string, isAttr: ?boolean) => string;
  declare var htmlDec: (str: string) => string;
  declare var stringify: (obj: any, opts: ?StringMap) => string;
  declare var parse: (str: string) => any;
}
