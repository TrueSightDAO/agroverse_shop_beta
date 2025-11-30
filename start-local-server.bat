@echo off
REM Quick local server startup script for Agroverse Shop (Windows)
REM This script provides multiple options for running a local server

echo 🌱 Agroverse Shop - Local Development Server
echo ==============================================
echo.

REM Check if Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo ✅ Node.js found
    
    REM Check if http-server is installed
    if exist "node_modules\http-server" (
        echo ✅ http-server found
        echo.
        echo Starting server on http://127.0.0.1:8000
        echo Press Ctrl+C to stop
        echo.
        npx http-server -p 8000 -a 127.0.0.1 -c-1
        exit /b 0
    ) else (
        echo ⚠️  http-server not found. Installing...
        call npm install
        echo.
        echo Starting server on http://127.0.0.1:8000
        echo Press Ctrl+C to stop
        echo.
        npx http-server -p 8000 -a 127.0.0.1 -c-1
        exit /b 0
    )
)

REM Check if Python is installed
where python >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo ✅ Python found
    echo.
    echo Starting server on http://127.0.0.1:8000
    echo Press Ctrl+C to stop
    echo.
    python -m http.server 8000 --bind 127.0.0.1
    exit /b 0
)

echo ❌ No suitable server found!
echo.
echo Please install one of the following:
echo   - Node.js: https://nodejs.org/
echo   - Python: https://www.python.org/
echo.
echo Or manually run:
echo   npm install ^&^& npm run dev
echo   OR
echo   python -m http.server 8000 --bind 127.0.0.1
exit /b 1




