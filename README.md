# Virtual Lab

Laboratorio de disoluciones organizado para seguir desarrollándolo. Conserva el diseño y las funciones del HTML anterior. La aplicación funciona en el navegador; todavía no es un ejecutable de Windows.

## Arrancar en Windows

1. Instala **Node.js 24 LTS** (incluye npm).
2. Abre **Iniciar_laboratorio.cmd** con doble clic.
3. La primera ejecución instala las dependencias y necesita internet. Las siguientes utilizan las dependencias locales.
4. Mantén abierta la terminal mientras trabajas. Ciérrala o pulsa Ctrl+C para detener el servidor.

También puedes usar la terminal:

```sh
npm ci
npm run dev
```

Abre http://localhost:5173. Vite actualiza la página al guardar cambios. El servidor solo escucha en este equipo.

## Seguir mejorándolo

| Qué cambiar | Dónde |
| --- | --- |
| Estructura de la interfaz | `index.html` |
| Apariencia y pantallas pequeñas | `src/styles/laboratory.css` |
| Volumen y concentraciones | `src/core/solution.ts` |
| Solutos y datos educativos | `src/data/catalog.ts` |
| Pipeta y bureta | `src/instruments/dosing.js` |
| Grifo y enrase | `src/instruments/water.js` |
| Transferencia del vaso al matraz | `src/instruments/pouring.js` |
| Cristalería, cámara y escena | `src/scene/engine.js` |
| Superficie y movimiento del líquido | `src/scene/liquid.js` |
| Animación del vertido | `src/scene/pouring-animation.js` |
| Disoluciones guardadas | `src/storage/reserve.js` |
| Menús flotantes y resultados | `src/ui/` |
| Estado de la sesión | `src/state/laboratory.js` |

El núcleo químico y la entrada están en TypeScript. Los controles y el motor existentes se han separado en módulos JavaScript para conservar su comportamiento y poder tiparlos progresivamente. No se ha añadido un framework de interfaz.

`src/main.ts` conecta explícitamente las acciones del HTML con los módulos. Si añades un control con un atributo `onclick`, importa y registra su función ahí; para nuevos componentes, se recomienda `addEventListener`.

## Verificar y compilar

```sh
npm test
npm run typecheck
npm run build
npm run preview
```

La versión distribuible se genera en `dist/` y se sirve en http://localhost:4173 con preview. Publica el contenido de dist en cualquier alojamiento estático. No abras index.html con doble clic: los módulos necesitan un servidor local.

Las pruebas de navegador se ejecutan con `npm run test:e2e`. Instala Chromium una vez con `npx playwright install chromium`, o configura `PLAYWRIGHT_CHANNEL=msedge` para usar Edge instalado. Las pruebas lanzan y detienen su propio servidor en el puerto 5187.

## Datos existentes y funcionamiento sin conexión

Three.js se instala con el proyecto y se incluye en la compilación: no se descarga desde una CDN al abrir el laboratorio.

Las reservas se guardan en el almacenamiento del navegador, asociado a la dirección y al perfil usados. Las reservas del HTML abierto como archivo **no se importan automáticamente** a localhost; tampoco se comparten entre el servidor de desarrollo (5173) y preview (4173). Antes de limpiar datos del navegador, conserva tus preparaciones.

## Alcance del modelo

El volumen usa coeficientes aparentes constantes por soluto y la densidad del agua se aproxima a 1 g/mL. Las ondas, el chorro y el vertido son un modelo visual de superficie libre, no una simulación completa de dinámica de fluidos. El proyecto facilita mejorar estos modelos sin tocar el resto de la aplicación.

## Futuro ejecutable

Esta estructura puede empaquetarse posteriormente con Electron conservando el mismo núcleo y la misma interfaz. Electron no se incluye todavía.

## Módulos ácido-base y temperatura

El selector superior cambia entre dos mesas de trabajo independientes. Se conservan por separado las preparaciones, los instrumentos, el historial y las reservas; las reservas de ácido-base usan otra clave de almacenamiento. Las sesiones activas se conservan al cambiar de módulo durante la misma apertura, y las reservas también al recargar.

En **Reactivos ácido-base**, añade cantidades libres de NaOH, HCl, ácido acético, amoniaco o NaCl en gramos o moles. No necesitas una disolución de stock: puedes añadir el reactivo a agua ya presente o añadir agua/enrasar después. La opción alternativa por concentración admite hasta 1 mol/L y su volumen indicado es final, no volumen de agua. HCl y NH3 se representan como soluto puro equivalente; no se presentan como sólidos. Carga la bureta desde uno de esos recipientes para hacer una valoración. El equilibrio se resuelve con balance de carga, autoprotólisis del agua y balances analíticos de ácido acético y amoniaco. Las cantidades conservadas son las de reactivos aportados, no una lista de todas las especies presentes en equilibrio.

**pH e indicadores** está disponible también en Disoluciones para las sustancias soportadas. La fenolftaleína, el naranja de metilo y el azul de bromotimol colorean el líquido. Los indicadores se consideran trazas sin volumen ni efecto sobre el equilibrio; sus colores y rangos son aproximados.

**Temperatura** está en ambos módulos. La placa aumenta gradualmente la temperatura del líquido; al apagarla, se enfría hacia 25 °C. Los matraces, pipetas y buretas no se calientan. El aviso evita medir por la marca a una temperatura distinta de la calibración. No se modelan evaporación, dilatación del líquido, calor de neutralización ni variación térmica de Ka de los ácidos débiles; solo se ajusta Kw del agua mediante una interpolación aproximada. Por tanto no es un simulador termodinámico completo.

Archivos nuevos: src/core/acid-base.ts, src/ui/acid-base.js, src/app/workspaces.js y src/instruments/temperature.js. Prueba de navegador: npm run test:acidbase.

Fuentes del modelo:
- [UC Davis, manual de laboratorio: indicadores](https://chemistry.ucdavis.edu/sites/g/files/dgvnsk196/files/inline-files/CHE%202A%20SLM%202024SS%20v1.pdf).
- [Purdue: indicadores ácido-base](https://chemed.chem.purdue.edu/genchem/demosheets/17.3.html).
- [OpenStax: constantes de ácidos y bases](https://openstax.org/books/chemistry-2e/pages/14-3-relative-strengths-of-acids-and-bases).
- [IAPWS, ionización del agua (2024)](https://iapws.org/public/documents/5pjeC/Kw-2024.pdf). Se usa una tabla didáctica aproximada, no la ecuación completa.
- [BRAND: material volumétrico y temperatura](https://www.brand.de/en/company/newsroom/volumetric-instruments). La estabilidad frente al calor depende del vidrio; el aviso de la simulación no afirma que todo calentamiento produzca una pérdida permanente del aforo.

## Preparación libre y curvas de valoración

La preparación por cantidad suma los nuevos gramos o moles a la composición existente. No sustituye el reactivo que ya contiene el recipiente. El pH se calcula cuando hay agua. El soluto seco NaOH/NaCl se representa en el fondo en lugar de simular un líquido antes de disolverlo.

**Curva y teoría** abre una ventana independiente que puede permanecer junto a la bureta. El registro comienza al abrir la llave con muestra y valorante válidos. El eje X es el volumen acumulado que realmente sale de la bureta, no el tiempo ni la lectura nominal. Puedes pausar y reanudar, mostrar pOH y exportar las medidas en CSV. Deshacer restaura también el registro; cada módulo conserva su curva durante la sesión.

La línea continua registra los pH calculados en cada adición real. La línea discontinua es una referencia a partir de las condiciones iniciales; la banda muestra el viraje del indicador y la línea vertical, la equivalencia estequiométrica 1:1 prevista cuando el valorante es fuerte y puro. La referencia usa exactamente el mismo motor de equilibrio y dilución que las medidas. Si cambias la muestra o la concentración del valorante, el próximo uso de la llave inicia otra serie; los cambios de temperatura pueden separar las medidas de la referencia inicial.

La fenolftaleína se representa incolora por debajo de pH 8,3, progresivamente rosa en el intervalo 8,3–10 y rosa por encima de 10. Se ha retirado la decoloración instantánea a pH muy alto: el modelo no simula la cinética de ese fenómeno. Por tanto no hay que esperar a pH 7 para que desaparezca el rosa.

La sección de teoría explica pH/pOH, equivalencia frente a punto final, curvas fuerte–fuerte y débil–fuerte, región tampón, semiequivalencia y selección del indicador. Fuente complementaria: [OpenStax, Acid-Base Titrations](https://openstax.org/books/chemistry-2e/pages/14-7-acid-base-titrations).

Archivos: src/core/titration.ts (referencia química), src/app/titration.js (registro de las adiciones), src/ui/titration-curve.js (gráfica). Prueba de navegador: npm run test:titration. Las pruebas unitarias incluyen el color a pH 10–14, equivalencia y semiequivalencia, conservación de reactivos y coincidencia entre referencia y transferencias reales.

## Bureta y pipeta colocadas en la escena

Al cargar un instrumento se monta automáticamente sobre el destino seleccionado. También puedes usar Colocar sobre el destino sin cargarlo. Cambiar de destino mueve el montaje; retirarlo conserva el líquido que quede dentro.

La bureta tiene soporte, tubo graduado, menisco y llave accionable con clic. Los controles junto a la llave regulan la apertura sin tener que mantener abierto el menú lateral. La pipeta tiene un pulsador: haz clic en él para descargar la dosis configurada, en la punta para una gota, o utiliza los controles junto al instrumento. La descarga de pipeta es progresiva y se puede detener; deshacer restaura el contenido anterior a la descarga.

El nivel visible se calcula con el volumen real restante del instrumento. Las gotas y el chorro llegan al recipiente elegido, y las transferencias conservan masa, moles y agua. En ácido-base, el pH y la curva de valoración siguen utilizando las cantidades que salen de la bureta. El modelo también está disponible en vista 2D.

Código: src/scene/instruments.js, src/instruments/mount.js y src/instruments/pipette.js. Prueba: npm run test:instruments. La cámara encuadra el instrumento al colocarlo y después permite rotar, hacer zoom y desplazar con Shift.

## Volumen y densidad de las disoluciones

El volumen de una disolucion acuosa de un solo soluto se calcula como masa total / densidad. La correlacion de Laliberte (2009), DOI 10.1021/je8008123, usa temperatura y fraccion masica, con coeficientes contrastados con los anexos XLS aportados. Se incluyen NaCl, NaOH, HCl, H2SO4, NH3, CH3COOH, CuSO4, CoCl2, KI y NaHCO3. Los parametros y rangos estan en `src/data/density.ts`; las ecuaciones en `src/core/density.ts`.

Se permiten incrementos y contracciones: 200 mL de agua con 5.844 g de NaCl dan 201.821 mL a 25 C; con 4 g de NaOH dan 199.705 mL. El enrase resuelve numericamente el agua necesaria; las alicuotas conservan masas y moles y recalculan el volumen del destino antes de aceptar una transferencia.

`volH2OMl` es el volumen equivalente de agua pura a 25 C, un inventario proporcional a masa (rho25 = 0.997044895 g/mL). No representa un volumen parcial medible dentro de la disolucion. La temperatura cambia el volumen calculado, conservando masa. El modelo termico sigue siendo aproximado y no incorpora calor de disolucion o neutralizacion.

La interfaz avisa al extrapolar fuera de los rangos de los datos. Estos rangos no garantizan solubilidad en todas las combinaciones de temperatura y concentracion: se supone disolucion completa. Glucosa, H2Mal, KMnO4 y AgNO3 conservan el modelo aproximado, identificado en pantalla, sin inventar parametros. Las mezclas de distintos reactivos tambien usan una aproximacion; no se modela su contraccion de reaccion. Los solutos del catalogo son anhidros; no se sustituyen por sales hidratadas.

Los anexos originales no se modifican. La auditoria de extraccion y comparacion se encuentra en `.tools/density-audit/validation.json`. Las pruebas de densidad, contraccion, enrase, avisos y capacidad estan en `tests/density.test.mjs`.