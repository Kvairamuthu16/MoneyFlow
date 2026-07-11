module.exports = {
  presets: ['module:@react-native/babel-preset'],
  // 'react-native-reanimated/plugin' must stay last in this list.
  plugins: ['nativewind/babel', 'react-native-reanimated/plugin'],
};
