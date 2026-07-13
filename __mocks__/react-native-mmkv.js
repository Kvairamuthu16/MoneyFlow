// Manual Jest mock for react-native-mmkv: a real native module with no
// implementation available under Jest. Backs storage with a plain in-memory
// Map so AppStorage's read/write logic can be exercised in tests.
class MMKV {
  constructor() {
    this._store = new Map();
  }

  set(key, value) {
    this._store.set(key, String(value));
  }

  getString(key) {
    return this._store.has(key) ? this._store.get(key) : undefined;
  }

  getBoolean(key) {
    return this._store.has(key) ? this._store.get(key) === 'true' : undefined;
  }

  delete(key) {
    this._store.delete(key);
  }

  clearAll() {
    this._store.clear();
  }
}

module.exports = { MMKV };
