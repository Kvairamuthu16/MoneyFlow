// Minimal in-memory fake of react-native-keychain, keyed by service, for Jest.
const store = new Map();

module.exports = {
  setGenericPassword: jest.fn(async (username, password, options) => {
    store.set(options?.service || 'default', { username, password, service: options?.service, storage: 'fake' });
    return { service: options?.service || 'default', storage: 'fake' };
  }),
  getGenericPassword: jest.fn(async (options) => {
    const entry = store.get(options?.service || 'default');
    return entry || false;
  }),
  resetGenericPassword: jest.fn(async (options) => {
    store.delete(options?.service || 'default');
    return true;
  }),
  ACCESSIBLE: {},
  ACCESS_CONTROL: {},
  AUTHENTICATION_TYPE: {},
  SECURITY_LEVEL: {},
  BIOMETRY_TYPE: {},
  STORAGE_TYPE: {},
  SECURITY_RULES: {}
};
