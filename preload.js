// preload.js — Secure bridge between renderer and main process
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  runRename: (options) => ipcRenderer.invoke('run-rename', options),
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
});
