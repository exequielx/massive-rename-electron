// main.js
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const renameSeries = require('./rename_series');

function createWindow() {
  const win = new BrowserWindow({
    width: 620,
    height: 460,
    webPreferences: {
      preload: path.join(__dirname, 'renderer.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Handle rename request from renderer
ipcMain.handle('run-rename', async (event, options) => {
  try {
    await renameSeries(options);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
