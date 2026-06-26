'use strict';
// MSW v2 + undici require several Web API globals that jest-environment-jsdom
// does not expose on Node.js globalThis. Define them all before undici loads.
// See: https://mswjs.io/docs/migrations/1.x-to-2.x

const { TextDecoder, TextEncoder } = require('node:util');
const { ReadableStream, WritableStream, TransformStream } = require('node:stream/web');
const { MessageChannel, MessagePort, BroadcastChannel } = require('node:worker_threads');

// JSDOM's setTimeout returns plain numbers; undici's timer module calls .unref() on the
// return value. Wrap the existing setTimeout so that the numeric handle is boxed into an
// object with a no-op .unref()/.ref() before undici loads its timer module.
const _origSetTimeout = globalThis.setTimeout;
const _origClearTimeout = globalThis.clearTimeout;
const _origSetInterval = globalThis.setInterval;
const _origClearInterval = globalThis.clearInterval;

function wrapHandle(id) {
  if (id !== null && id !== undefined && typeof id !== 'object') {
    return Object.assign(Object(id), { _id: id, unref() { return this; }, ref() { return this; } });
  }
  if (id !== null && id !== undefined && typeof id === 'object' && typeof id.unref !== 'function') {
    id.unref = () => id;
    id.ref = () => id;
  }
  return id;
}

globalThis.setTimeout = function(fn, ms, ...args) {
  return wrapHandle(_origSetTimeout.call(globalThis, fn, ms, ...args));
};
globalThis.clearTimeout = function(handle) {
  return _origClearTimeout.call(globalThis, handle && handle._id !== undefined ? handle._id : handle);
};
globalThis.setInterval = function(fn, ms, ...args) {
  return wrapHandle(_origSetInterval.call(globalThis, fn, ms, ...args));
};
globalThis.clearInterval = function(handle) {
  return _origClearInterval.call(globalThis, handle && handle._id !== undefined ? handle._id : handle);
};

Object.defineProperty(globalThis, 'TextDecoder', { writable: true, value: TextDecoder });
Object.defineProperty(globalThis, 'TextEncoder', { writable: true, value: TextEncoder });
Object.defineProperty(globalThis, 'ReadableStream', { writable: true, value: ReadableStream });
Object.defineProperty(globalThis, 'WritableStream', { writable: true, value: WritableStream });
Object.defineProperty(globalThis, 'TransformStream', { writable: true, value: TransformStream });
Object.defineProperty(globalThis, 'MessageChannel', { writable: true, value: MessageChannel });
Object.defineProperty(globalThis, 'MessagePort', { writable: true, value: MessagePort });
Object.defineProperty(globalThis, 'BroadcastChannel', { writable: true, value: BroadcastChannel });

// clearImmediate is a Node.js global that jsdom doesn't expose
if (typeof globalThis.clearImmediate === 'undefined') {
  globalThis.clearImmediate = (id) => clearTimeout(id);
}
if (typeof globalThis.setImmediate === 'undefined') {
  globalThis.setImmediate = (fn, ...args) => setTimeout(fn, 0, ...args);
}

// performance.markResourceTiming is called by undici after a fetch completes
if (typeof globalThis.performance !== 'undefined') {
  if (typeof globalThis.performance.markResourceTiming !== 'function') {
    globalThis.performance.markResourceTiming = () => {};
  }
  if (typeof globalThis.performance.clearResourceTimings !== 'function') {
    globalThis.performance.clearResourceTimings = () => {};
  }
}

// Now undici can load (it needs all the globals above)
const undici = require('undici');

// undici's Request requires absolute URLs, but RTK Query fetchBaseQuery uses relative
// paths like '/api/users'. Wrap Request to resolve relative URLs to http://localhost.
class CompatRequest extends undici.Request {
  constructor(input, init) {
    if (typeof input === 'string' && input.startsWith('/')) {
      input = `http://localhost${input}`;
    }
    super(input, init);
  }
}

// configurable: true is required so @mswjs/interceptors can patch these globals
Object.defineProperty(globalThis, 'fetch', { writable: true, configurable: true, value: undici.fetch });
Object.defineProperty(globalThis, 'Headers', { writable: true, configurable: true, value: undici.Headers });
Object.defineProperty(globalThis, 'FormData', { writable: true, configurable: true, value: undici.FormData });
Object.defineProperty(globalThis, 'Request', { writable: true, configurable: true, value: CompatRequest });
Object.defineProperty(globalThis, 'Response', { writable: true, configurable: true, value: undici.Response });
