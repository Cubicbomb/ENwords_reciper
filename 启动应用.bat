@echo off
chcp 65001 >nul
echo ========================================
echo   CET4 背单词应用启动脚本
echo ========================================
echo.

echo 检查Python环境...
python --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo [错误] 未找到Python环境！
    echo.
    echo 解决方案：
    echo 1. 访问 https://www.python.org/downloads/ 下载Python
    echo 2. 安装时勾选 "Add Python to PATH"
    echo 3. 重新启动此脚本
    echo.
    pause
    exit /b 1
)

echo [成功] Python环境正常
echo.

echo 正在启动服务器...
echo 应用地址: http://localhost:5173
echo.
echo 提示: 按 Ctrl+C 可停止服务器
echo.

python -m http.server 5173

echo.
echo 服务器已停止
pause