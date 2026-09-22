@echo off
echo ========================================
echo   CET4 背单词应用启动脚本
echo ========================================
echo.

echo 正在检查Python环境...
python --version
if errorlevel 1 (
    echo.
    echo 错误: 未找到Python，请先安装Python
    echo 下载地址: https://www.python.org/downloads/
    pause
    exit /b 1
)

echo.
echo 正在启动本地服务器...
echo 应用地址: http://localhost:5173
echo.
echo 按 Ctrl+C 停止服务器
echo.

python -m http.server 5173

pause