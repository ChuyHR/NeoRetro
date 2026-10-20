// Puente entre la interfaz y el núcleo. La página no toca Node: solo puede pedir la biblioteca y
// pedir que se abra un juego. Es CommonJS porque los preload con sandbox no admiten módulos ES.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('neoArcade', {
  biblioteca: () => ipcRenderer.invoke('biblioteca'),
  jugar: (id) => ipcRenderer.invoke('jugar', id),
});
