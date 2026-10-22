#include "pantalla.h"

#include <errno.h>
#include <fcntl.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/ioctl.h>
#include <sys/mman.h>
#include <unistd.h>

#include "font8x8_basic.h"
#include "font8x8_ext_latin.h"

Pantalla pantalla;

int abrir_pantalla(void (*registrar)(const char *formato, ...)) {
  int fd = open("/dev/fb0", O_RDWR);
  if (fd < 0) {
    if (!getenv("NEO_SIMULAR")) return -1;
    // Simulación: 1280x720 a 32 bits, o a 16 bits en RGB565 (como el Game Stick) con NEO_SIMULAR=16.
    pantalla.simulada = 1;
    memset(&pantalla.var, 0, sizeof pantalla.var);
    pantalla.var.xres = 1280;
    pantalla.var.yres = 720;
    if (!strcmp(getenv("NEO_SIMULAR"), "16")) {
      pantalla.var.bits_per_pixel = 16;
      pantalla.var.red = (struct fb_bitfield){11, 5, 0};
      pantalla.var.green = (struct fb_bitfield){5, 6, 0};
      pantalla.var.blue = (struct fb_bitfield){0, 5, 0};
      pantalla.paso = 1280 * 2;
    } else {
      pantalla.var.bits_per_pixel = 32;
      pantalla.var.red = (struct fb_bitfield){16, 8, 0};
      pantalla.var.green = (struct fb_bitfield){8, 8, 0};
      pantalla.var.blue = (struct fb_bitfield){0, 8, 0};
      pantalla.var.transp = (struct fb_bitfield){24, 8, 0};
      pantalla.paso = 1280 * 4;
    }
  } else {
    struct fb_fix_screeninfo fix;
    if (ioctl(fd, FBIOGET_VSCREENINFO, &pantalla.var) < 0 || ioctl(fd, FBIOGET_FSCREENINFO, &fix) < 0) {
      if (registrar) registrar("pantalla: no se pudo leer la información del framebuffer (%s)", strerror(errno));
      close(fd);
      return -1;
    }
    pantalla.paso = fix.line_length;
    struct fb_var_screeninfo *v = &pantalla.var;
    if (registrar) {
      registrar("pantalla: %s, %ux%u visibles, %ux%u virtuales, %u bits, paso %u, memoria %u", fix.id, v->xres,
                v->yres, v->xres_virtual, v->yres_virtual, v->bits_per_pixel, fix.line_length, fix.smem_len);
      registrar("pantalla: rojo %u/%u verde %u/%u azul %u/%u transparencia %u/%u", v->red.offset, v->red.length,
                v->green.offset, v->green.length, v->blue.offset, v->blue.length, v->transp.offset,
                v->transp.length);
    }
    // Se dibuja en la primera página: si el sistema dejó otra a la vista, se regresa a la primera.
    if (v->yoffset != 0) {
      v->yoffset = 0;
      if (ioctl(fd, FBIOPAN_DISPLAY, v) < 0 && registrar) registrar("pantalla: no se pudo regresar a la página 0");
    }
    pantalla.fb = mmap(NULL, fix.smem_len, PROT_READ | PROT_WRITE, MAP_SHARED, fd, 0);
    if (pantalla.fb == MAP_FAILED) {
      if (registrar) registrar("pantalla: mmap falló (%s)", strerror(errno));
      pantalla.fb = NULL;
      close(fd);
      return -1;
    }
  }
  pantalla.ancho = pantalla.var.xres;
  pantalla.alto = pantalla.var.yres;
  pantalla.bpp = pantalla.var.bits_per_pixel;
  pantalla.tam = (size_t)pantalla.paso * pantalla.alto;
  pantalla.lienzo = calloc(1, pantalla.tam);
  return pantalla.lienzo ? 0 : -1;
}

uint32_t color(int r, int g, int b) {
  struct fb_var_screeninfo *v = &pantalla.var;
  uint32_t c = ((uint32_t)(r >> (8 - v->red.length)) << v->red.offset) |
               ((uint32_t)(g >> (8 - v->green.length)) << v->green.offset) |
               ((uint32_t)(b >> (8 - v->blue.length)) << v->blue.offset);
  // En el OSD de Amlogic un alfa en cero es transparente: se deja opaco.
  if (v->transp.length) c |= ((1u << v->transp.length) - 1) << v->transp.offset;
  return c;
}

void punto(int x, int y, uint32_t c) {
  if (x < 0 || y < 0 || x >= pantalla.ancho || y >= pantalla.alto) return;
  uint8_t *p = pantalla.lienzo + (size_t)y * pantalla.paso + (size_t)x * (pantalla.bpp / 8);
  switch (pantalla.bpp) {
    case 32: *(uint32_t *)p = c; break;
    case 24: p[0] = c; p[1] = c >> 8; p[2] = c >> 16; break;
    case 16: *(uint16_t *)p = (uint16_t)c; break;
  }
}

void rectangulo(int x, int y, int w, int h, uint32_t c) {
  // Se recorta una vez y se escribe por filas: pintar la pantalla entera punto por punto es lento en
  // el Cortex-A9.
  if (x < 0) { w += x; x = 0; }
  if (y < 0) { h += y; y = 0; }
  if (x + w > pantalla.ancho) w = pantalla.ancho - x;
  if (y + h > pantalla.alto) h = pantalla.alto - y;
  if (w <= 0 || h <= 0) return;
  int bytes = pantalla.bpp / 8;
  for (int j = y; j < y + h; j++) {
    uint8_t *p = pantalla.lienzo + (size_t)j * pantalla.paso + (size_t)x * bytes;
    if (bytes == 4) {
      uint32_t *q = (uint32_t *)p;
      for (int i = 0; i < w; i++) q[i] = c;
    } else if (bytes == 2) {
      uint16_t *q = (uint16_t *)p;
      for (int i = 0; i < w; i++) q[i] = (uint16_t)c;
    } else {
      for (int i = 0; i < w; i++, p += 3) { p[0] = c; p[1] = c >> 8; p[2] = c >> 16; }
    }
  }
}

void marco(int x, int y, int w, int h, int grosor, uint32_t c) {
  rectangulo(x, y, w, grosor, c);
  rectangulo(x, y + h - grosor, w, grosor, c);
  rectangulo(x, y, grosor, h, c);
  rectangulo(x + w - grosor, y, grosor, h, c);
}

static const char *glifo(uint32_t cp) {
  if (cp < 128) return font8x8_basic[cp];
  if (cp >= 0xA0 && cp <= 0xFF) return font8x8_ext_latin[cp - 0xA0];
  return font8x8_basic['?'];
}

int texto(int x, int y, int escala, uint32_t c, const char *s) {
  const unsigned char *u = (const unsigned char *)s;
  while (*u) {
    uint32_t cp = *u++;
    if (cp >= 0xE0 && (u[0] & 0xC0) == 0x80 && (u[1] & 0xC0) == 0x80) {  // tres bytes: ’ “ — …
      cp = ((cp & 0x0F) << 12) | ((u[0] & 0x3F) << 6) | (u[1] & 0x3F);
      u += 2;
      if (cp == 0x2018 || cp == 0x2019) cp = '\'';
      else if (cp == 0x201C || cp == 0x201D) cp = '"';
      else if (cp == 0x2013 || cp == 0x2014) cp = '-';
    } else if (cp >= 0xC0 && (*u & 0xC0) == 0x80) {
      cp = ((cp & 0x1F) << 6) | (*u++ & 0x3F);
    }
    const char *g = glifo(cp);
    for (int fila = 0; fila < 8; fila++)
      for (int col = 0; col < 8; col++)
        if (g[fila] & (1 << col)) rectangulo(x + col * escala, y + fila * escala, escala, escala, c);
    x += 8 * escala;
  }
  return x;
}

void mostrar(void) {
  if (pantalla.fb) memcpy(pantalla.fb, pantalla.lienzo, pantalla.tam);
}

void limpiar_pantalla(void) {
  if (!pantalla.lienzo) return;
  memset(pantalla.lienzo, 0, pantalla.tam);
  mostrar();
}

// PNG sin comprimir (bloques «stored»): para ver en la laptop lo que se dibujó en la simulación.
static uint32_t crc_tabla[256];
static uint32_t crc(uint32_t c, const uint8_t *d, size_t n) {
  if (!crc_tabla[1])
    for (uint32_t i = 0; i < 256; i++) {
      uint32_t k = i;
      for (int j = 0; j < 8; j++) k = k & 1 ? 0xEDB88320u ^ (k >> 1) : k >> 1;
      crc_tabla[i] = k;
    }
  c ^= 0xFFFFFFFFu;
  while (n--) c = crc_tabla[(c ^ *d++) & 0xFF] ^ (c >> 8);
  return c ^ 0xFFFFFFFFu;
}

static void be32(uint8_t *p, uint32_t v) {
  p[0] = v >> 24; p[1] = v >> 16; p[2] = v >> 8; p[3] = v;
}

static void trozo(FILE *f, const char *tipo, const uint8_t *datos, uint32_t n) {
  uint8_t cab[8];
  be32(cab, n);
  memcpy(cab + 4, tipo, 4);
  fwrite(cab, 1, 8, f);
  if (n) fwrite(datos, 1, n, f);
  be32(cab, crc(crc(0, (const uint8_t *)tipo, 4), datos, n));
  fwrite(cab, 1, 4, f);
}

void guardar_png(const char *ruta) {
  if (pantalla.bpp != 32 && pantalla.bpp != 16) return;
  int w = pantalla.ancho, h = pantalla.alto;
  size_t fila = (size_t)w * 3 + 1, crudo = fila * h;
  uint8_t *img = malloc(crudo);
  for (int y = 0; y < h; y++) {
    uint8_t *d = img + y * fila;
    *d++ = 0;
    for (int x = 0; x < w; x++) {
      if (pantalla.bpp == 32) {
        uint32_t c = *(uint32_t *)(pantalla.lienzo + (size_t)y * pantalla.paso + x * 4);
        *d++ = c >> 16; *d++ = c >> 8; *d++ = c;
      } else {  // RGB565
        uint16_t c = *(uint16_t *)(pantalla.lienzo + (size_t)y * pantalla.paso + x * 2);
        *d++ = (c >> 8) & 0xF8; *d++ = (c >> 3) & 0xFC; *d++ = (c << 3) & 0xF8;
      }
    }
  }
  size_t bloques = (crudo + 65534) / 65535, n = 2 + crudo + bloques * 5 + 4;
  uint8_t *z = malloc(n), *p = z;
  *p++ = 0x78;
  *p++ = 0x01;
  uint32_t a = 1, b = 0;
  for (size_t i = 0; i < crudo; i++) {
    a = (a + img[i]) % 65521;
    b = (b + a) % 65521;
  }
  for (size_t i = 0; i < crudo; i += 65535) {
    uint16_t len = crudo - i > 65535 ? 65535 : (uint16_t)(crudo - i);
    *p++ = i + len >= crudo;
    *p++ = len; *p++ = len >> 8; *p++ = ~len; *p++ = (uint16_t)~len >> 8;
    memcpy(p, img + i, len);
    p += len;
  }
  be32(p, (b << 16) | a);
  FILE *f = fopen(ruta, "wb");
  if (f) {
    fwrite("\x89PNG\r\n\x1a\n", 1, 8, f);
    uint8_t ihdr[13];
    be32(ihdr, w);
    be32(ihdr + 4, h);
    ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = ihdr[11] = ihdr[12] = 0;
    trozo(f, "IHDR", ihdr, 13);
    trozo(f, "IDAT", z, (uint32_t)n);
    trozo(f, "IEND", NULL, 0);
    fclose(f);
  }
  free(img);
  free(z);
}
