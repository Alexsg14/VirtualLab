# Publicación manual en GitHub Pages

El workflow **Publicar laboratorio en Pages** solo se ejecuta mediante **Run workflow**. No contiene eventos `push`, `pull_request` ni tareas programadas. Subir cambios a `main` no actualiza la web. Solo permite publicar la rama `main`.

## Primera publicación

1. En GitHub, abre **Settings → Pages** y elige **GitHub Actions** como Source.
2. Abre **Actions → Publicar laboratorio en Pages → Run workflow**.
3. Selecciona `main` y pulsa **Run workflow**.
4. Espera a que los trabajos `build` y `deploy` terminen correctamente. El segundo mostrará el enlace publicado: https://alexsg14.github.io/VirtualLab/.

La conexión usada para editar el repositorio no incluye herramientas para cambiar Settings ni iniciar workflows. Esos dos pasos se realizan desde la cuenta propietaria de GitHub; no requieren compartir credenciales.

## Qué comprueba y publica

Usa Node.js 24 y máquinas estándar de Ubuntu. Instala las dependencias, ejecuta las pruebas, prepara los recursos locales de LaTeX y compila la aplicación. Una prueba de navegador carga la distribución estática bajo `/VirtualLab/` y exige descargar un PDF real; bloquea conexiones externas del navegador. Solo después de pasar las comprobaciones publica `dist/`.

Las acciones oficiales están fijadas a identificadores de commit. Los permisos de escritura de Pages y el token de identidad solo están en el trabajo de publicación. El archivo temporal de publicación tiene retención de un día. No utiliza máquinas especiales, servicios de PDF ni cachés ampliadas de pago.

## Siguientes actualizaciones y retirada

Para actualizar la web, vuelve a ejecutar el mismo workflow desde `main`. Si falla la compilación o una prueba, no se ejecuta el despliegue; se conserva la web anteriormente publicada. La aplicación local funciona igual que antes.

Para despublicar, usa la opción correspondiente en **Settings → Pages**. Esto no elimina el repositorio ni las copias locales. Las reservas de la versión local y las de Pages son independientes: se guardan en el navegador y están asociadas a direcciones distintas.