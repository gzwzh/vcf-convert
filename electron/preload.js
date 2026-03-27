const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getDefaultOutputDir: () => ipcRenderer.invoke('get-default-output-dir'),
  selectFiles: (options) => ipcRenderer.invoke('select-files', options),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  selectOutputDir: () => ipcRenderer.invoke('select-output-dir'),
  saveFile: (data) => ipcRenderer.invoke('save-file', data),
  saveBinaryFile: (data) => ipcRenderer.invoke('save-binary-file', data),
  getDirname: (filePath) => ipcRenderer.invoke('get-dirname', filePath),
  openFolder: (folderPath) => ipcRenderer.invoke('open-folder', folderPath),
  openExternalUrl: (url) => ipcRenderer.invoke('open-external-url', url),
  generateSignature: (data) => ipcRenderer.invoke('generate-signature', data),
  getDeviceId: () => ipcRenderer.invoke('get-device-id'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getSoftwareId: () => ipcRenderer.invoke('get-software-id'),
  checkUpdate: () => ipcRenderer.invoke('check-update'),
  startUpdate: (data) => ipcRenderer.invoke('start-update', data),
  quitApp: () => ipcRenderer.invoke('quit-app'),
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  toggleMaximizeWindow: () => ipcRenderer.invoke('window-toggle-maximize'),
  closeWindow: () => ipcRenderer.invoke('window-close'),
  isWindowMaximized: () => ipcRenderer.invoke('window-is-maximized'),
});
