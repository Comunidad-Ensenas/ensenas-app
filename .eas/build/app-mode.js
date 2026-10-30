const fs = require('fs');
const path = require('path');

function getAppMode() {
  const appDir = path.join(__dirname, '../../app');
  const learnerVisible = fs.existsSync(path.join(appDir, '(app)'));
  const studioVisible = fs.existsSync(path.join(appDir, '(studio)'));

  if (learnerVisible !== studioVisible) {
    return studioVisible ? 'studio' : 'learner';
  }

  return process.env.EXPO_PUBLIC_APP_MODE === 'studio' ? 'studio' : 'learner';
}

module.exports = { getAppMode };
