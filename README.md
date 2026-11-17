<div align="center">

# Virtual Lab

### Química en el navegador: preparar, observar y comprender.

Laboratorio interactivo para estudiar disoluciones y valoraciones ácido-base mediante una escena 3D, instrumentos de dosificación y resultados calculados en tiempo real.

**Three.js · TypeScript · JavaScript · Vite**

[Instalación](#instalación) · [Disoluciones](#disoluciones) · [Valoraciones](#valoraciones-ácido-base) · [Modelo científico](#modelo-científico) · [Desarrollo](#desarrollo)

</div>

![Escena 3D con un Erlenmeyer y un matraz aforado que contienen disoluciones coloreadas](docs/images/laboratorio-3d.jpg)

## Un laboratorio para experimentar

Virtual Lab permite relacionar las operaciones de laboratorio con las magnitudes químicas que las describen: **masa, volumen, concentración, densidad, temperatura y pH**. Está orientado al aprendizaje de química en ESO y Bachillerato.

| Preparar | Manipular | Analizar |
| :--- | :--- | :--- |
| Añadir soluto y agua, enrasar y diluir. | Transferir alícuotas con pipeta, regular una bureta y agitar. | Consultar concentración, densidad, pH y curvas de valoración. |
| Elegir recipiente y capacidad. | Calentar, enfriar y guardar disoluciones. | Exportar resultados a TXT y medidas de valoración a CSV. |

La interfaz ofrece modos día y noche, cámara 3D, malla de referencia opcional, información de los recipientes y la posibilidad de deshacer operaciones.

## Disoluciones

### El volumen de agua no es el volumen de disolución

Para preparar una disolución de concentración conocida hay que controlar el **volumen final**, no solo la cantidad de agua añadida. Al disolver un soluto, las interacciones con el agua pueden producir un aumento o una contracción del volumen.

![Modo día: el panel distingue 200 mL de agua de los 201,8 mL finales de una disolución de NaCl](docs/images/densidad-enrase.jpg)

**Ejemplo: preparar 200 mL de NaCl 0,5 M a 25 °C.**

1. Calcula la cantidad de soluto: `n = C × V = 0,5 × 0,200 = 0,100 mol`.
2. Pesa **5,844 g de NaCl**.
3. Disuelve con una cantidad de agua inferior al volumen objetivo.
4. Completa con agua hasta **200 mL de disolución**.

| Procedimiento | Volumen final | Molaridad |
| :--- | ---: | ---: |
| Disolver y enrasar a 200 mL | 200,000 mL | 0,5000 mol/L |
| Añadir el soluto a 200 mL de agua | ≈ 201,821 mL | ≈ 0,4955 mol/L |

El simulador calcula el agua necesaria para el enrase y actualiza las concentraciones después de cada adición o transferencia. Para los solutos con datos de densidad, el volumen se obtiene de la composición y la temperatura de la muestra.

### Material y operaciones

- **Recipientes:** vaso de precipitados, matraz aforado, Erlenmeyer y probeta, con capacidades ajustables.
- **Pipeta:** carga independiente, transferencia de alícuotas y dosificación por gotas.
- **Bureta:** llave de apertura regulable, goteo a bajo caudal y lectura del volumen entregado.
- **Agua y enrase:** adición directa o mediante grifo, con límite de llenado.
- **Registro:** historial de operaciones, reservas de disoluciones y exportación de resultados.

## Valoraciones ácido-base

La dosificación con bureta permite seguir la evolución del pH y comparar el registro con una referencia de equilibrio calculada a partir de las condiciones iniciales.

![Valoración de ácido acético con NaOH: bureta, fenolftaleína y curva de pH frente al volumen añadido](docs/images/valoracion-acido-base.jpg)

En esta valoración, **25 mL de ácido acético 0,1 M** reciben **NaOH 0,1 M**. La equivalencia estequiométrica se alcanza a los **25 mL de valorante**, con un pH superior a 7 por tratarse de un ácido débil y una base fuerte.

| Elemento de la gráfica | Interpretación |
| :--- | :--- |
| Curva continua | Evolución del pH calculado durante las adiciones. |
| Línea discontinua | Referencia calculada con la composición inicial. |
| Banda de color | Intervalo de viraje del indicador. |
| Marcas verticales | Volúmenes de equivalencia estequiométrica previstos. |

El módulo admite **HCl, NaOH, CH₃COOH, NH₃, H₂SO₄, ácido malónico y NaCl**. Incluye indicadores, lectura de pH y pOH, pausa y reanudación de la dosificación y exportación de la curva a CSV. Los ácidos dipróticos incorporan dos etapas de disociación; sus equivalencias no siempre generan dos saltos de pH separados.

## Instalación

### Requisitos

- **Node.js 24 LTS**, con npm.
- Un navegador con soporte WebGL.

```sh
git clone https://github.com/Alexsg14/VirtualLab.git
cd VirtualLab
npm ci
npm run dev
```

Abre **http://localhost:5173**. En Windows también puedes iniciar el laboratorio con **`Iniciar_laboratorio.cmd`**. Mantén abierta la terminal y pulsa `Ctrl+C` para detener el servidor.

> [!NOTE]
> La primera instalación de dependencias requiere conexión a internet. La aplicación se ejecuta mediante un servidor local; no abras `index.html` directamente como archivo.

### Compilar para distribuir

```sh
npm run build
npm run preview
```

La web compilada se genera en **`dist/`**. La vista previa está disponible en **http://localhost:4173**. Para desplegarla en un alojamiento estático, publica el contenido de `dist/`.

## Modelo científico

### Densidad y volumen

El cálculo conserva las masas de agua y soluto y aplica la relación:

**V(T, w) = masa total / ρ(T, w)**

La correlación de **Laliberté (2009)** permite calcular la densidad en función de la temperatura `T` y de la fracción másica de soluto `w`. Se han incorporado parámetros verificados para:

**NaCl · NaOH · HCl · H₂SO₄ · NH₃ · CH₃COOH · CuSO₄ · CoCl₂ · KI · NaHCO₃**

La interfaz identifica el modelo utilizado y muestra avisos al extrapolar fuera del rango de los datos. Los parámetros corresponden a las formas anhidras del catálogo.

### Alcance y aproximaciones

| Área | Alcance actual |
| :--- | :--- |
| Solutos sin parámetros de densidad | Glucosa, ácido malónico, KMnO₄ y AgNO₃ utilizan un volumen aproximado, identificado en pantalla. |
| Mezclas de reactivos | El volumen es aproximado; no se calcula la contracción de reacción. |
| Solubilidad | Se supone disolución completa. No se simulan sólido sin disolver, precipitación ni cristalización. |
| Temperatura | Modifica la densidad y el volumen. No incluye evaporación, dilatación del recipiente ni calor de disolución o neutralización. |
| Equilibrio ácido-base | Modelo ideal, sin correcciones de actividad ni cinética de reacción. Constantes de equilibrios débiles de referencia a 25 °C; el producto iónico del agua varía con la temperatura. |
| Representación del líquido | Superficie libre con ondas y amortiguación; no es un modelo volumétrico SPH/PBF. |

**Referencia:** [Laliberté, 2009 · DOI 10.1021/je8008123](https://doi.org/10.1021/je8008123). Consulta los [parámetros de densidad](src/data/density.ts), las [ecuaciones](src/core/density.ts) y la [auditoría numérica](.tools/density-audit/validation.json).

## Desarrollo

### Estructura del proyecto

| Ruta | Responsabilidad |
| :--- | :--- |
| `src/core/` | Volumen, concentración y equilibrio químico. |
| `src/data/` | Catálogo de sustancias y parámetros de densidad. |
| `src/app/`, `src/state/`, `src/storage/` | Operaciones, estado de la sesión y reservas. |
| `src/instruments/` | Pipeta, bureta, grifo y control de temperatura. |
| `src/scene/` | Escena 3D, cristalería y representación del líquido. |
| `src/ui/`, `src/styles/`, `index.html` | Interfaz y presentación de resultados. |
| `src/education/` | Desafíos y herramientas educativas. |
| `tests/`, `scripts/` | Verificación y compilación. |

### Verificación

```sh
npm test
npm run typecheck
npm run build
```

Para ejecutar las pruebas de navegador:

```sh
npx playwright install chromium
npm run test:e2e
npm run test:acidbase
npm run test:titration
npm run test:instruments
```

También se puede utilizar Edge instalado. En PowerShell, establece `$env:PLAYWRIGHT_CHANNEL='msedge'` antes de ejecutar las pruebas. Cada prueba inicia y detiene su propio servidor local.

### Persistencia

Las disoluciones guardadas se almacenan en el navegador, asociadas al perfil y a la dirección de la aplicación. No se sincronizan entre dispositivos ni mediante GitHub. Desarrollo (`localhost:5173`) y vista previa (`localhost:4173`) utilizan almacenamientos separados.