@echo off
echo ========================================
echo   CET4 Vocabulary Learning App
echo ========================================
echo.

echo Checking Python environment...
python --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo [ERROR] Python not found!
    echo.
    echo Please install Python:
    echo 1. Visit https://www.python.org/downloads/
    echo 2. Install Python and check "Add Python to PATH"
    echo 3. Restart this script
    echo.
    pause
    exit /b 1
)

echo [OK] Python environment is ready
echo.

echo Starting server...
echo Application URL: http://localhost:5173
echo.
echo Press Ctrl+C to stop the server
echo.

python -m http.server 5173

echo.
echo Server stopped
pause