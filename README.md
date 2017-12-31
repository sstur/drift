# Drift: Cross-platform Server JS

This is a small framework for writing synchronous-style server-side JavaScript and deploying to any of several supported platforms. There is a dev-server written for Node and a build script that will produce files for the various platforms.

## Status: UNMAINTAINED

This project is long outdated and is no longer maintained.

## Goals

The goal of this project is not to compete with full-blown frameworks, but to provide a minimal layer of request routing, view templating and data modelling with a normalized synchronous-style API using Fibers.

In order to work across various platforms, this project uses its own module loader and abstraction layers for request/response, filesystem, etc. It closely follows conventions from Node and CommonJS.

JSON and ES5 are available across all supported platforms via simple polyfills. Basic eventing is provided similar to EventEmitter, and the define()/require() system of module loading is sort of a hybrid between Node/CommonJS and AMD.

## Modules / Interface Abstractions

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

## View Layer

Jinja templates!

## Data Persistence

Database interfaces are particularly hard to abstract in a truly agnostic way. SQLite and MySQL are the first adapters to be implemented.

ORM support is limited and supports CRUD and basic joins but not schema creation/migration. Data modeling can get tricky when we attempt to support relational and NoSQL with the same interface and we have not yet crossed that bridge.

## Controllers/Routing

Provides a simple routing implementation, similar to Express, and we have basic resourceful routing.

## License (MIT)

Copyright (C) 2015 Simon Sturmer.

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
