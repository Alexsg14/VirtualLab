# Armario de reactivos comerciales

Disponible dentro de **Soluto → Desde un bote comercial** y de **Reactivos ácido-base → Desde un bote comercial**. El bote correspondiente al soluto elegido se preselecciona cuando está disponible. Se incluyen cuatro representaciones propias de botes de referencia: HCl acuoso al 36 % m/m, H₂SO₄ concentrado al 98 % nominal, NaOH en lentejas y NaCl sólido.

## Datos y documentación

Cada ficha identifica fórmula, CAS, masa molar, presentación, especificación del fabricante, pictogramas e indicaciones H/P seleccionadas. Los dibujos son didácticos; los enlaces de producto y FDS permiten consultar la documentación completa y su versión territorial. Las fichas incluidas funcionan sin Internet; abrir la documentación externa necesita conexión. Fecha de consulta: 19 de noviembre de 2026.

- HCl: Merck/Supelco 115186, Suprapur, 36 % m/m; densidad nominal 1,18 g/mL a 20 °C. https://www.merckmillipore.com/INTL/es/product/Hydrochloric-acid-360-0%2CMDA_CHEM-115186
- H₂SO₄: Merck/Supelco 193400, EMPLURA, ~98 % m/m; en la simulación 98 % nominal y densidad 1,840 g/mL a 25 °C. Se aporta tanto ácido como agua y no se simula calor de dilución. https://www.sigmaaldrich.com/ES/en/product/mm/193400
- NaOH: Merck/Supelco 106498, EMSURE, lentejas; ensayo ≥ 99,0 %. https://www.merckmillipore.com/CH/en/product/Sodium-hydroxide%2CMDA_CHEM-106498
- NaCl: Merck/Supelco 106404, EMSURE; ensayo ≥ 99,5 %, sin clasificación de peligro según la FDS de referencia. https://www.merckmillipore.com/MC/en/product/mm/106404

Los sólidos se representan explícitamente como muestras idealizadas al 100 %. Una especificación mínima no proporciona el ensayo exacto de un lote ni permite conocer la composición de sus impurezas. No se introduce agua ficticia para completar el porcentaje. No se simulan absorción de humedad o carbonatación del NaOH.

## Preparación

Para HCl, un volumen V del producto aporta masa total ρV, masa de HCl wρV y masa de agua (1−w)ρV. La masa de agua se suma al inventario y el volumen final se recalcula con el modelo existente. La temperatura inicial del producto es 20 °C, la de los sólidos 25 °C; se mantiene la mezcla térmica aproximada del simulador, sin calor de reacción.

La calculadora opcional obtiene n=CV y la cantidad de producto necesaria. Para HCl 0,5 M en 200 mL: n=0,1 mol, masa de HCl=3,646 g y volumen nominal de producto=3,646/(0,36×1,18)≈8,583 mL. La ayuda no añade ni enrasa automáticamente: el usuario controla las operaciones. El agua que contiene el producto ya cuenta. Si el objetivo supera la concentración del bote, se informa de que no puede obtenerse por dilución.

En Disoluciones se conserva un solo soluto; en Ácido-base se permiten los reactivos del modelo. Una operación incompatible, no finita o que supera la capacidad no cambia el recipiente. Las adiciones se registran con las propiedades y masas utilizadas; el diario PDF/.tex incluye sus factores de conversión en una sección adicional. Si después hay transferencias o vaciados, esa sección describe adiciones históricas y no las atribuye al inventario final.

El modelo ideal de pH, los límites de datos de densidad y la suposición de disolución completa permanecen. Los botes no implican simulación de impurezas ni certifican la concentración analítica de un lote real.

## Verificación

`npm test` incluye conservación de masa, contenido de agua del HCl, enrase, transferencias, compatibilidad, idealización de sólidos y trazabilidad en LaTeX. `npm run test:cabinet` comprueba fichas, cálculo y dosificación, errores, cierre por Escape, diseño móvil y compilación de un PDF comercial real; requiere los recursos locales de LaTeX preparados.