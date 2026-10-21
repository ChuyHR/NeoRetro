// Mandos conectados: arranca el lector (lector-mandos.py), elige el perfil de cada mando y entrega a
// main.js tres cosas: las acciones de la interfaz, los controles que se pulsan (para «Probar
// control») y los sucesos crudos (para «Configurar control», que aún no tiene perfil).
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { crearNavegacion } from './navegacion.js';
import { claveDeMando, crearTraductor, normalizar, sigueLaNorma } from './traductor.js';

const LECTOR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'lector-mandos.py');
const ESPERA_REINICIO_MS = 3000;

// mapa: config/gamepad-map.json. perfilGuardado(clave): el mapeo que el usuario hizo en «Configurar
// control», o null.
export function iniciarMandos({ mapa, perfilGuardado, alAccion, alControl, alCrudo, alCambio, anotar }) {
  const mandos = new Map(); // id del dispositivo ("event5") → { info, clave, perfil, traducir }
  const navegacion = crearNavegacion({ acciones: mapa.acciones, repeticion: mapa.repeticion, emitir: alAccion });
  let proceso = null;
  let detenido = false;

  function asignarPerfil(mando) {
    const propio = perfilGuardado(mando.clave);
    mando.perfil = propio ?? (sigueLaNorma(mando.info) ? mapa.estandar : null);
    mando.origen = propio ? 'configurado' : mando.perfil ? 'estandar' : 'sin-configurar';
    mando.traducir = mando.perfil ? crearTraductor(mando.perfil, mando.info.ejes, mapa.umbral) : null;
  }

  const resumen = () => [...mandos.values()].map(({ info, clave, origen }) => ({
    id: info.id, nombre: info.nombre, clave, origen,
  }));

  function suceso(dato) {
    switch (dato.tipo) {
      case 'conectado': {
        const mando = { info: dato, clave: claveDeMando(dato) };
        asignarPerfil(mando);
        mandos.set(dato.id, mando);
        anotar('mando', 'conectado', dato.nombre, mando.clave, mando.origen);
        alCambio(resumen());
        return;
      }
      case 'desconectado': {
        const mando = mandos.get(dato.id);
        mandos.delete(dato.id);
        navegacion.soltarTodo();
        if (mando) anotar('mando', 'desconectado', mando.info.nombre);
        alCambio(resumen());
        return;
      }
      case 'sin-permiso':
        anotar('mando', 'sin permiso para leerlo', dato.nombre, dato.id);
        return;
      default: {
        const mando = mandos.get(dato.id);
        if (!mando) return;
        // Para «Configurar control»: el eje en -1…1 y su punto de reposo en la misma escala.
        const rango = mando.info.ejes[dato.codigo];
        const crudo = { mando: mando.clave, nombre: mando.info.nombre, origen: mando.origen, tipo: dato.tipo, codigo: dato.codigo, valor: dato.valor };
        if (dato.tipo === 'eje') {
          crudo.normalizado = normalizar(dato.valor, rango);
          crudo.reposo = rango ? normalizar(rango[3] ?? (rango[0] + rango[1]) / 2, rango) : 0;
        }
        alCrudo(crudo);
        if (!mando.traducir) return;
        for (const cambio of mando.traducir(dato)) {
          alControl({ mando: mando.clave, ...cambio });
          navegacion.cambiar(cambio);
        }
      }
    }
  }

  function arrancar() {
    proceso = spawn('python3', [LECTOR], { stdio: ['ignore', 'pipe', 'pipe'] });
    createInterface({ input: proceso.stdout }).on('line', (linea) => {
      try {
        suceso(JSON.parse(linea));
      } catch (error) {
        anotar('mando', 'línea ilegible del lector', linea, String(error));
      }
    });
    proceso.stderr.on('data', (texto) => anotar('mando', 'error del lector', String(texto).trim()));
    proceso.on('error', (error) => anotar('mando', 'no se pudo arrancar el lector', String(error)));
    proceso.on('exit', (codigo) => {
      mandos.clear();
      navegacion.soltarTodo();
      alCambio([]);
      if (detenido) return;
      anotar('mando', 'el lector se cerró', `código ${codigo}`, `se reinicia en ${ESPERA_REINICIO_MS} ms`);
      setTimeout(arrancar, ESPERA_REINICIO_MS);
    });
  }

  arrancar();
  return {
    lista: resumen,
    soltarTodo: () => navegacion.soltarTodo(),
    // Tras guardar un mapeo nuevo, los mandos de ese modelo lo usan sin reconectarlos.
    recargar(clave) {
      for (const mando of mandos.values()) if (mando.clave === clave) asignarPerfil(mando);
      alCambio(resumen());
    },
    conectados: () => [...mandos.values()].map(({ info, clave, perfil, origen }) => ({ info, clave, perfil, origen })),
    detener() {
      detenido = true;
      proceso?.kill();
    },
  };
}
