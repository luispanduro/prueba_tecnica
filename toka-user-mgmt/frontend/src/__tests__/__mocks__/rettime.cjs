'use strict';
// Stub for rettime — used only by msw's experimental defineNetwork API which we don't need in tests.
// TypedEvent extends Event (not MessageEvent) so it works in any environment.
class TypedEvent extends Event {
  constructor(type, init) {
    super(type, init);
  }
}
class Emitter {
  hooks = { on() {}, removeListener() {} };
  on() { return this; }
  once() { return this; }
  off() { return this; }
  emit() { return false; }
  emitAsPromise() { return Promise.resolve([]); }
  *emitAsGenerator() {}
  removeListener() {}
  removeAllListeners() {}
  listeners() { return []; }
  listenerCount() { return 0; }
}
module.exports = { TypedEvent, Emitter };
