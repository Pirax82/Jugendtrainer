// Learn more https://docs.expo.io/guides/customizing-metro
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Work around Metro resolution issues when npm hoists dependencies that some packages
// (notably expo-router / react-native) expect to be resolvable from nested node_modules.
// This prevents Metro from throwing and returning HTTP 500 for the JS bundle.
config.resolver = config.resolver || {};
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  '@expo/metro-runtime': path.resolve(__dirname, 'node_modules/@expo/metro-runtime'),
  '@react-native/normalize-colors': path.resolve(__dirname, 'node_modules/@react-native/normalize-colors'),
};

module.exports = config;

