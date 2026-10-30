// Learn more https://docs.expo.io/guides/customizing-metro
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { getAppMode } = require('./.eas/build/app-mode');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const appDir = path.join(__dirname, 'app');
const appMode = getAppMode();

config.resolver.assetExts.push('task', 'wasm', 'bin', 'glb', 'tflite', 'vrm');

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const blockedDirs = [
  path.join(appDir, appMode === 'studio' ? '(app)' : '(studio)'),
  path.join(appDir, '.(app)'),
  path.join(appDir, '.(studio)'),
];

const defaultBlockList = config.resolver.blockList;
const blockedPatterns = blockedDirs.map(
  (dir) => new RegExp(`^${escapeRegExp(dir.replace(/\\/g, '/'))}/.*$`)
);

config.resolver.blockList = [
  ...(Array.isArray(defaultBlockList) ? defaultBlockList : defaultBlockList ? [defaultBlockList] : []),
  ...blockedPatterns,
];

module.exports = config;
