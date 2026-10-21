// Puente entre la interfaz y el núcleo. La página no toca Node: solo puede pedir la biblioteca, abrir
// un juego, guardar el mapeo de un mando y escuchar lo que hacen los mandos. Es CommonJS porque los
// preload con sandbox no admiten módulos ES.
const { contextBridge, ipcRenderer } = require('electron');

const CANALES = ['mando-accion', 'mando-control', 'mando-crudo', 'mandos'];

contextBridge.exposeInMainWorld('neoArcade', {
  biblioteca: () => ipcRenderer.invoke('biblioteca'),
  jugar: (id) => ipcRenderer.invoke('jugar', id),
  mandos: () => ipcRenderer.invoke('mandos'),
  guardarMapeo: (clave, perfil) => ipcRenderer.invoke('guardar-mapeo', clave, perfil),
  escuchar(canal, alRecibir) {
    if (CANALES.includes(canal)) ipcRenderer.on(canal, (_evento, dato) => alRecibir(dato));
  },
});
