@echo off
setlocal
cd /d "%~dp0"
set "LAB_NODE=node"
where node >nul 2>nul
if not errorlevel 1 goto :check_version
if not exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" goto :node_missing
set "LAB_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
:check_version
"%LAB_NODE%" -e "const [major,minor]=process.versions.node.split('.').map(Number);process.exit(major>22||(major===22&&minor>=18)?0:1)"
if errorlevel 1 goto :node_missing
if exist node_modules\vite\bin\vite.js goto :start
where npm >nul 2>nul
if errorlevel 1 goto :node_missing
if exist package-lock.json (call npm ci) else (call npm install)
if errorlevel 1 goto :failed
:start
echo Abriendo laboratorio en http://localhost:5173
echo Cierra esta ventana o pulsa Ctrl+C para detenerlo.
"%LAB_NODE%" node_modules\vite\bin\vite.js --configLoader native --host 127.0.0.1 --port 5173 --strictPort --open
if errorlevel 1 goto :failed
exit /b 0
:node_missing
echo Instala Node.js 24 LTS desde https://nodejs.org y vuelve a abrir este archivo.
pause
exit /b 1
:failed
echo No se ha podido iniciar. Revisa el mensaje anterior. La primera instalacion necesita internet.
pause
exit /b 1
