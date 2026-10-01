const fs = require('fs');
const path = require('path');

const mode = process.env.EXPO_PUBLIC_APP_MODE || process.argv[2] || 'learner'; 
const appDir = path.join(__dirname, '../../app');

const learnerVisible = path.join(appDir, '(app)');
const learnerHidden = path.join(appDir, '.(app)');

const studioVisible = path.join(appDir, '(studio)');
const studioHidden = path.join(appDir, '.(studio)');

console.log(`\nDetermining app mode: ${mode.toUpperCase()}`);

if (mode === 'studio') {
  if (fs.existsSync(learnerVisible)) fs.renameSync(learnerVisible, learnerHidden);
  if (fs.existsSync(studioHidden)) fs.renameSync(studioHidden, studioVisible);
  console.log('Studio mode stablished');
} else {
  if (fs.existsSync(studioVisible)) fs.renameSync(studioVisible, studioHidden);
  if (fs.existsSync(learnerHidden)) fs.renameSync(learnerHidden, learnerVisible);
  console.log('Learner mode stablished');
}