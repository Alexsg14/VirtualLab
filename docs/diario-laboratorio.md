# Diario de laboratorio

**Diario PDF · Cálculos** exporta la disolución del recipiente activo, sus operaciones y los factores de conversión de molaridad, g/L, porcentaje en masa, ppm y molalidad. Primera versión: un único soluto. Usa el volumen final real del modelo, sin asumir que se haya enrasado correctamente. Permite añadir autor y observaciones. **Ver ejemplo de PDF** abre un documento incluido, sin preparar LaTeX.

## Preparación inicial

```sh
npm run preparar:latex
npm run dev
```

El primer comando requiere Internet una vez: descarga aproximadamente 38 MB y verifica cada archivo con su identificador Git. Guarda el compilador, el formato, las fuentes y los paquetes en `public/vendor/latex`. Si se interrumpe, puede repetirse y reutiliza los archivos correctos.

Para distribuir una copia sin conexión, incluir toda esa carpeta ya preparada y las dependencias habituales del laboratorio. No hace falta instalar LaTeX. El servidor de npm solo sirve archivos: el PDF se compila en un Web Worker del navegador y no se envía el experimento a ningún servicio externo. Se hacen dos pasadas y se libera el worker al terminar. El laboratorio puede arrancar aunque falten los recursos: al solicitar un PDF mostrará instrucciones. El `.tex` se descarga independientemente.

## Procedencia

Motor pdfTeX de [SwiftLaTeX](https://github.com/SwiftLaTeX/SwiftLaTeX), distribuido bajo AGPL-3.0. Recursos de la copia [texbrain](https://github.com/swimmingbrain/texbrain), fijada al commit `34edceddc82a8ff0a592ab62bebf060810b8302d`. Paquetes y fuentes conservan sus respectivas licencias de TeX Live. El manifiesto local identifica los archivos y su procedencia. La adaptación del worker desactiva la búsqueda de paquetes por red: se precargan todos los recursos del diario.

## Comprobaciones

`npm test` verifica cálculos, estado, trazabilidad y escape de texto. `npm run test:diary` comprueba el `.tex`, el PDF de ejemplo y el aviso de preparación. Si están los recursos preparados, exige compilar un PDF real bloqueando toda conexión externa. Si faltan, declara expresamente pendiente esa comprobación.