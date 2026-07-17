// main.js — Electron main process
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const renameSeries = require('./rename_series');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 700,
    height: 720,
    minWidth: 520,
    minHeight: 600,
    backgroundColor: '#0f0f1a',
    titleBarStyle: 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.loadFile('index.html');
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

// ─── IPC handlers ───

// Open native FILE picker (multiple files)
ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    title: 'Seleccionar archivos a renombrar',
  });
  return result;
});

// Run rename
ipcMain.handle('run-rename', async (_event, options) => {
  try {
    const logs = await renameSeries(options);
    return { success: true, logs };
  } catch (err) {
    return { success: false, error: err.message, logs: [] };
  }
});
