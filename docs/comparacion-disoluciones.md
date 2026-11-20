# Comparación de disoluciones guardadas

1. Abre **Disoluciones guardadas** y guarda las preparaciones que quieras estudiar.
2. Marca **Incluir en comparación** en dos o más fichas.
3. Pulsa **Comparar seleccionadas**. La tabla puede exportarse con **Exportar comparación CSV**.

La selección no recupera las disoluciones, no modifica los recipientes activos y no registra operaciones. La tabla toma una instantánea al abrirse: el CSV contiene esos mismos datos aunque después cambie la sesión. Cerrar la ventana conserva la selección; **Quitar selección** la limpia. Recuperar, eliminar o deshacer una reserva invalida las selecciones que ya no corresponden a las fichas existentes.

## Datos

La tabla incluye nombres, fechas disponibles, sustancias, recipiente/capacidad, masa registrada, moles, agua presente, volumen final, molaridad, g/L, porcentaje en masa, ppm (mg/kg), molalidad, temperatura, densidad, pH del modelo ideal y fuentes/avisos del modelo de volumen. Los valores se recalculan con el modelo actual a partir de las cantidades guardadas.

**Agua presente** no es la suma histórica de agua añadida: una transferencia puede retirar parte del agua y un bote comercial puede aportarla. El volumen equivalente a 25 °C representa esa masa como agua pura; no es su volumen parcial dentro de la disolución.

Para mezclas ácido-base se indican los reactivos registrados y los avisos. No se presenta una molaridad, molalidad o cantidad de soluto única, que podría confundirse con la composición de equilibrio. El símbolo — significa dato no aplicable o no calculado. No hay valoración automática de corrección de las preparaciones ni itinerario guiado.

## Exportación y accesibilidad

El CSV usa UTF-8 con BOM, separador de punto y coma y coma decimal. Se escapan comillas y se neutralizan nombres que Excel podría interpretar como fórmulas. No incluye estados no seleccionados.

La selección usa casillas etiquetadas y marcas, sin depender del color. La tabla tiene encabezados de filas y columnas; admite desplazamiento con teclado y desplazamiento horizontal en pantallas pequeñas. Escape cierra la comparación sin cerrar el panel de reservas.

## Comprobaciones

`npm test` verifica la conservación de las reservas, las diferencias entre enrasar y añadir el volumen objetivo de agua, las unidades del CSV y las mezclas. `npm run test:comparison` verifica selección mínima de dos, conservación del foco, tabla y exportación de solo lectura, nombres seguros, cierre, móvil y eliminación de fichas seleccionadas. Esta prueba se ejecuta antes del despliegue manual en Pages.