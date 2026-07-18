// preload.js — Secure bridge between renderer and main process
const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('api', {
  runRename: (options) => ipcRenderer.invoke('run-rename', options),
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  validateFiles: (filePaths) => ipcRenderer.invoke('validate-files', filePaths),
  getPathForFile: (file) => {
    try {
      return webUtils.getPathForFile(file);
    } catch (e) {
      console.error('Error getting path for file:', e);
      return '';
    }
  }
});
