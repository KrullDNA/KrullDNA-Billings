const { app } = require('electron');
const path = require('path');
const fs = require('fs');

const configPath = path.join(app.getPath('userData'), 'window-state.json');

function getWindowState() {
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
  } catch {
    // ignore
  }
  return { width: 1280, height: 860 };
}

function saveWindowState(bounds) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(bounds));
  } catch {
    // ignore
  }
}

module.exports = { getWindowState, saveWindowState };
