#Drift: Cross-platform Server JS

This is a small framework for writing synchronous-style server-side JavaScript and deploying to any of several supported platforms. There is a dev-server written for Node and a build script that will produce files for the various platforms.

Supported platforms:

 * Node (using Fibers)
 * Apache (using v8cgi)
 * IIS (native)
 * JVM via DynJS/Nashorn (possible future)

##Status: Alpha
At this stage, this is not much more than a proof-of-concept. With better test coverage and better parity among the various platform-specific adapters, we can see how feasable it is for real-world apps.

##Goals
The goal of this project is not to compete with full-blown frameworks like Express or RoR, but to provide a minimal layer of request routing, view templating and data modelling with a normalized API for various JavaScript platforms.

Because of the inconsistencies in platforms, we have created our own module loader and abstraction layers for request/response, filesystem, etc. None-the-less, we closely follow conventions from Node/CommonJS and other mainstream frameworks. This results in an intuitive API that will seem familiar to any full-stack JS developer.

In some cases (e.g. Buffer) we mimic the Node module as closely as possible, however with the filesystem module, we opt for a higher-level API.

JSON and ES5 are available across all supported platforms via simple polyfills. Basic eventing is provided similar to EventEmitter, and the define()/require() system of module loading is sort of a hybrid between Node/CommonJS and AMD.

Overall, this we follow existing conventions where it makes sense.

##Modules / Interface Abstractions
So far Drift provides

 * Normalized Request/Response interface
 * Relational Database Abstraction
 * Basic Object-Relational Models
 * View Templating
 * Request Body parsing (form-urlencoded, application/json, non-buffering multipart)
 * Buffer class (just like Node except without subscript byte access)
 * Cookies and Session support
 * Sending files in a non-buffering way
 * HTTP client
 * Email client (SMTP)
 * Filesystem
 * Utils like Logging, Crypto, Date formatting, etc

##View Layer
Jinja templates!

##Data Persistence
Database interfaces are particularly hard to abstract in a truly agnostic way. SQLite and MySQL are the first adapters to be implemented. Plans for noSQL (Mongo/Couch) are in the works.

ORM support is limited and supports CRUD and basic joins but not schema creation/migration. Data modeling can get tricky when we attempt to support relational and NoSQL with the same interface and we have not yet crossed that bridge.

##Controllers/Routing
Provides a simple routing implementation, similar to ExpressJS or Sinatra, and we have basic "resourceful" routing.

##Todo

 * Better Test Coverage
 * Modeling/ORM needs work
 * Provide a way to provide high-level modules (like Auth) that can be dropped in to apps

## License (MIT)

Copyright (C) 2013 Simon Sturmer.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
documentation files (the "Software"), to deal in the Software without restriction,
including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense,
and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the
Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
USE OR OTHER DEALINGS IN THE SOFTWARE.
