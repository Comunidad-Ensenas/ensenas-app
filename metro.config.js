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

// three ships separate ESM (import) and CommonJS (require) builds, so R3F's CommonJS
// native entry and our ESM imports would each load a copy and three warns about it.
const threeModule = path.join(__dirname, 'node_modules/three/build/three.module.js');
const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'three') {
    return { type: 'sourceFile', filePath: threeModule };
  }
  return (defaultResolveRequest ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
