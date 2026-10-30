const { getAppMode } = require('./.eas/build/app-mode');

module.exports = ({ config }) => {
  if (getAppMode() !== 'studio') {
    return config;
  }

  return {
    ...config,
    name: 'Enseñas Studio',
    android: {
      ...config.android,
      package: 'com.ensenas.studio',
    },
  };
};
