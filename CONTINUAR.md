# Continuar el desarrollo

Trabaja en la raíz de este repositorio. El código de la aplicación está en src/.

1. Abre Iniciar_laboratorio.cmd.
2. Cambia el módulo de la función que quieras mejorar; consulta el mapa de README.md.
3. Comprueba el cambio en el navegador; Vite lo actualiza al guardar.
4. Si cambias química o transferencias, añade una prueba de conservación o de comportamiento en tests/chemistry.test.mjs.
5. Ejecuta npm test y npm run build antes de distribuir.

El modelo químico (src/core) no debe importar DOM ni Three.js. Los componentes de interfaz presentan resultados; los módulos de instrumentos realizan operaciones; la escena representa el estado. El estado de la sesión vive en src/state/laboratory.js. Los temporizadores del grifo y del vertido pertenecen a sus respectivos módulos.

Esta es una migración gradual. Hay llamadas mutuas entre módulos de interfaz y escena que se han conservado para reducir el riesgo de cambiar el comportamiento. Al ampliar una función, conviene sustituir esas llamadas por eventos o una capa de aplicación. No vuelvas a juntar los módulos en un HTML y no uses el archivo generado de dist como código fuente.

El núcleo químico y el arranque tienen comprobación estricta de TypeScript. Los módulos JavaScript restantes no están totalmente tipados: se pueden convertir uno a uno, añadiendo tipos de recipiente, instrumento y sesión cuando se modifiquen.

Para Electron se reutilizarán src y la compilación de Vite. Deja el empaquetado para una fase posterior; no hace falta rehacer el laboratorio.
