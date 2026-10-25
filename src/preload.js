const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('gost', {
  command: (name, value) => ipcRenderer.invoke('command', name, value),
  onState: callback => ipcRenderer.on('state', (_event, value) => callback(value)),
  onFocusAddress: callback => ipcRenderer.on('focus-address', () => callback())
});
