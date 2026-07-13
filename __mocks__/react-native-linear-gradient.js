// Manual Jest mock: renders as a plain View since the real native gradient
// rendering isn't available under Jest.
const React = require('react');
const { View } = require('react-native');

function LinearGradient({ children, ...props }) {
  return React.createElement(View, props, children);
}

module.exports = LinearGradient;
module.exports.default = LinearGradient;
