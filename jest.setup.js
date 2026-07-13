import 'react-native-reanimated/mock';

jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

// react-native-mmkv, react-native-linear-gradient, and react-native-get-sms-android are
// native modules with no real implementation available under Jest; see their
// manual mocks in __mocks__/.
