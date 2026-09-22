@echo off
echo ========================================
echo   CET4 Vocabulary Learning App
echo ========================================
echo.

echo Checking Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo ERROR: Python not found!
    echo Please install Python from https://www.python.org/downloads/
    echo.
    pause
    exit /b 1
)

echo Python found!
echo.
echo Starting server on http://localhost:5173
echo Press Ctrl+C to stop
echo.

python -m http.server 5173
pause