// Learn more https://docs.expo.io/guides/customizing-metro
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const appMode = process.env.EXPO_PUBLIC_APP_ENV || 'learner';

config.resolver.assetExts.push('task', 'wasm', 'bin');

if (appMode === 'studio') {
  config.resolver.blockList = [
    new RegExp(`^${path.resolve(__dirname, 'app/(app)').replace(/\\/g, '/')}/.*$`)
  ];
} else {
  config.resolver.blockList = [
    new RegExp(`^${path.resolve(__dirname, 'app/(studio)').replace(/\\/g, '/')}/.*$`)
  ];
}

module.exports = config;
