// Puente entre la interfaz y el núcleo. La página no toca Node: solo puede pedir la biblioteca, abrir
// un juego, guardar el mapeo de un mando y escuchar lo que hacen los mandos. Es CommonJS porque los
// preload con sandbox no admiten módulos ES.
const { contextBridge, ipcRenderer } = require('electron');

const CANALES = ['mando-accion', 'mando-control', 'mando-crudo', 'mandos'];

contextBridge.exposeInMainWorld('neoArcade', {
  biblioteca: () => ipcRenderer.invoke('biblioteca'),
  jugar: (id, opciones) => ipcRenderer.invoke('jugar', id, opciones),
  datosUsuario: () => ipcRenderer.invoke('datos-usuario'),
  guardarDatosUsuario: (datos) => ipcRenderer.invoke('guardar-datos-usuario', datos),
  medir: process.env.NEO_ARCADE_MEDIR === '1', // solo para medir fluidez (core/main.js)
  mandos: () => ipcRenderer.invoke('mandos'),
  guardarMapeo: (clave, perfil) => ipcRenderer.invoke('guardar-mapeo', clave, perfil),
  escuchar(canal, alRecibir) {
    if (CANALES.includes(canal)) ipcRenderer.on(canal, (_evento, dato) => alRecibir(dato));
  },
});
