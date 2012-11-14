#Cross-platform Server JS

This is a small framework for writing synchronous server-side JavaScript and deploying to any of several supported
platforms. There is a dev-server written for Node and a build script that will produce deploy files for the
various platforms.

Supported platforms:

 * Node (using Fibers)
 * Apache (using v8cgi)
 * IIS (native)
 * Rhino/Google App Engine (coming later)

##Status: Incomplete
At this stage, this is barely more than a proof-of-concept and is not really complete. After more tests are added,
the API solidified and the various platform-specific adapters brought into compliance with each other, I will probably
build some real-world apps to see how it performs.

##Goals
The goal of PlatformJS is not to compete with full-blown Node frameworks like Express, but to provide a minimal layer
of request routing, view templating and data modelling with a normalized API for very different underlying platforms.

Because of the inconsistencies in web platforms, we have to roll our own module loader and abstraction layers for
request/response, filesystem, http/smtp client and database interfaces. I try to closely follow the way Node,
CommonJS and other popular frameworks do things. This creates a familiar API that should seem intuitive to the typical
JavaScript programmer.

In some cases (e.g. Buffer) we mimic the Node module as close as possible, however with our filesystem module, we
provide a slightly higher-level API.

ES5 methods are available across all supported platforms via simple polyfills. Basic eventing is provided similar to
EventEmitter the way you are used to doing events. The define()/require() method of module loading is sort of a hybrid
between Node, CommonJS and RequireJS.

Overall, we follow conventions everyone is familiar with because the idea is to present a low barrier of entry.

##Modules / Interface Abstractions
So far PlatformJS provides:
 * Normalized Request/Response instances
 * Request Body parsing (supporting form, application/json, non-buffering multipart, etc)
 * Buffer (just like Node but cannot access individual bytes by subscript: buf[1])
 * Cookies and Session support
 * Sending files in a non-buffering way
 * HTTP Client
 * Email sending (SMTP)
 * Filesystem
 * Templating
 * Utilities like Logging, MD5, Date formatting, URL parsing, etc

##View Layer
Currently we are using the fantastic Liquid templating engine ported to JS by (darthapo)
[http://github.com/darthapo/liquid.js] with modifications to fit in our framework. It turns out this is a bit
heavy for our purposes so there are plans to port one more option and implement an interface for choosing the
templating module from the config (providing each conforms to a simple interface). Pre-compiling and caching
the templates for performance would be the next step.

##Data Persistence
Database interfaces are particularly hard to abstract in a truly platform agnostic way, so this is in the early stages
at this point. SQLite will probably be the first adapter to work across the supported platforms, and will likely
use an API similar to node-sqlite3 or the WebSQL proposal. MySQL will be next, or possibly CouchDB which is an easy
one due to it's pure HTTP interface.

I am considering an ORM from the various existing Node and client-side libraries with the goal of being light-weight
while providing a simple but complete interface. Data moddeling can get complex if we wish to support relational and
NoSQL at the persistence level, but there are a lot of great Node modules out there that do just that.

##Controllers/Routing
We include a rather basic routing implementation at the moment which does not provide a "resourceful" interface. Our
aim is not to be a replacement for Rails-like frameworks, so simple routing is adequate at this point and keeps
PlatformJS lightweight. This may change in the future as we build our first real-world apps.

##Todo
 * Better Test Coverage
 * Robust config options with multi-environment support
 * Build process should exclude unused modules
 * Provide a way to write higher-level modules (like Auth) that can be dropped in to quickly build robust apps


## License (MIT)

Copyright (C) 2012 Simon Sturmer.

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
