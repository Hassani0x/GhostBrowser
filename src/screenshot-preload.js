const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('screenshot', {
  image: () => ipcRenderer.invoke('screenshot-image'),
  ready: () => ipcRenderer.invoke('screenshot-ready'),
  select: rectangle => ipcRenderer.invoke('screenshot-select', rectangle),
  cancel: () => ipcRenderer.invoke('screenshot-cancel')
});
