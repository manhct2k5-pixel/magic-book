@echo off
setlocal
cd /d "%~dp0"
set PORT=8000

start "" "http://localhost:%PORT%"

where py >nul 2>nul
if %ERRORLEVEL%==0 (
  py -3 -m http.server %PORT%
) else (
  python -m http.server %PORT%
)
