# Fidel Tester

Tests E2E de Fidel con **Playwright** (modo librería) + un **launcher HTML** para
parametrizar y correr un test por cada vista del sistema, sin tocar código.

## Cómo funciona

1. Cada vista a probar es un archivo en `src/tests/` (ej: `cargaDeProductos.js`).
2. Cada test exporta `meta` (qué campos pide: cuenta, email, proveedor, etc.) y `run(ctx)` (el flujo).
3. El launcher lee esos `meta`, te arma el formulario, y al correr lanza el test pasándole tus datos.
4. El log aparece en vivo en la página.

## Para el tester

```powershell
# 1) Preparar todo (una sola vez) — doble clic a instalar.bat
#    Instala Node y Git si faltan, clona el repo y deja todo listo.
#    No hace falta tener NADA previo: alcanza con instalar.bat.

# 2) Abrir el launcher (cada vez que quieras probar)
powershell -ExecutionPolicy Bypass -File scripts\abrir.ps1

# 3) Traer cambios nuevos cuando el dev los suba
powershell -ExecutionPolicy Bypass -File scripts\actualizar.ps1
```

## Para el dev (vos)

```powershell
# Guardar y subir cambios a GitHub
powershell -ExecutionPolicy Bypass -File scripts\guardar.ps1 -Mensaje "qué cambié"
```

## Agregar una vista nueva

1. Copiá `src/tests/_plantilla.js` a `src/tests/miVista.js`.
2. Ajustá `meta.campos` y escribí el flujo en `run`.
3. Aparece sola en el launcher.

## Estructura

```
src/
  run-test.js          runner: corre un test con las variables del form
  runner/server.js     launcher: sirve la UI + corre tests + log en vivo
  paginas/login.js     page-object de login (2 pasos: credenciales + cuenta)
  tests/               un archivo por vista (los que empiezan con _ se ocultan)
launcher/              UI del launcher (HTML/CSS/JS)
scripts/               instalar / abrir / actualizar / guardar (PowerShell)
```

> Requisitos: ninguno. `instalar.bat` instala Node y Git si faltan (winget o, si no
> hay, versión portable sin admin), clona el repo y el navegador (Chromium) lo
> instala `instalar.ps1`.
