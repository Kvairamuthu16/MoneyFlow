// Jest/Node already has a working crypto.getRandomValues (via jsdom/node polyfills
// in newer Node versions); this mock just needs to be a no-op import target.
if (typeof global.crypto === 'undefined' || typeof global.crypto.getRandomValues !== 'function') {
  global.crypto = {
    getRandomValues(array) {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    }
  };
}
