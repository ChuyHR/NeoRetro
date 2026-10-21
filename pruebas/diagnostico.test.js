import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { claveDeCfg, flatpakAlcanza } from '../core/diagnostico.js';

test('las rutas de RetroArch se leen de su retroarch.cfg, con ~ resuelto', () => {
  const cfg = 'libretro_directory = "~/.var/app/x/cores"\nsystem_directory = "/srv/bios"\n';
  assert.equal(claveDeCfg(cfg, 'libretro_directory'), path.join(os.homedir(), '.var/app/x/cores'));
  assert.equal(claveDeCfg(cfg, 'system_directory'), '/srv/bios');
  assert.equal(claveDeCfg(cfg, 'joypad_autoconfig_dir'), null);
});

test('se sabe si un emulador de Flathub alcanza la carpeta de juegos', () => {
  const casa = path.join(os.homedir(), 'roms');
  assert.equal(flatpakAlcanza(['host', 'xdg-run/pipewire-0'], casa), true);
  assert.equal(flatpakAlcanza(['host:ro'], '/media/usb/roms'), true);
  assert.equal(flatpakAlcanza(['home'], casa), true);
  assert.equal(flatpakAlcanza(['home'], '/media/usb/roms'), false);
  assert.equal(flatpakAlcanza(['host'], '/tmp/roms'), false); // /tmp es privado dentro de la caja
  assert.equal(flatpakAlcanza(['/media/usb'], '/media/usb/roms'), true);
});
