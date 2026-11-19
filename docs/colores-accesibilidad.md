# Colores y señales visuales accesibles

La interfaz conserva su identidad turquesa y los colores químicos del líquido y los indicadores. Las diferencias de estado se acompañan de texto, marcas o trazos. No se añade un modo separado de daltonismo ni un recorrido guiado.

## Cambios

- Texto secundario y de ayuda más legible en ambos temas. Bordes de controles y foco de teclado más definidos.
- Colores de botones con contraste comprobado tanto en reposo como al pasar el ratón; se mantiene el nombre explícito de cada acción.
- Errores con símbolo, prefijo «Error:» y anuncio de alerta, sin depender del rojo. Avisos con «Atención».
- Recipientes y capacidades seleccionados con marca visible y estado `aria-pressed`; el recipiente activo se identifica también mediante texto.
- Descripción textual del color previsto del indicador y de su intervalo de viraje. El cálculo y los RGB químicos permanecen sin cambios.
- pH continuo; referencia discontinua; pOH con trazo y punto y marcador romboidal. La equivalencia y el pH neutro se identifican por etiquetas. El intervalo del indicador usa una banda rayada. La leyenda reproduce los trazos y los nombra.

## Comprobaciones y alcance

`npm run test:colors` mide en navegador 24 combinaciones de botones (seis clases, dos temas, reposo/hover), comprueba contraste mínimo 4,5:1 para esas etiquetas y para la paleta de texto sobre los fondos principales, y 3:1 para los bordes, foco y curvas comprobados. Verifica además las marcas de selección, el error textual, la descripción del indicador y las series con trazos diferenciados. `npm test` comprueba que las descripciones no alteran el estado ni los colores del modelo químico.

El despliegue manual de Pages ejecuta también la comprobación de colores antes de publicar. No se afirma conformidad WCAG global: queda pendiente una revisión completa con lector de pantalla, ampliación, contenido dinámico y todos los controles. Estas mejoras son independientes de las propuestas pendientes de comparación de disoluciones y preferencias de movimiento.

Referencias: [WCAG 2.2, uso del color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color) y [contraste mínimo](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum).