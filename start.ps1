# CET4 背单词应用启动脚本 (PowerShell版本)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CET4 背单词应用启动脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查Python环境
Write-Host "检查Python环境..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Python未找到"
    }
    Write-Host "[成功] $pythonVersion" -ForegroundColor Green
} 
catch {
    Write-Host "[错误] 未找到Python环境！" -ForegroundColor Red
    Write-Host ""
    Write-Host "解决方案：" -ForegroundColor Yellow
    Write-Host "1. 访问 https://www.python.org/downloads/ 下载Python"
    Write-Host "2. 安装时勾选 'Add Python to PATH'"
    Write-Host "3. 重新启动此脚本"
    Write-Host ""
    Read-Host "按Enter键退出"
    exit 1
}

Write-Host ""

# 启动服务器
Write-Host "正在启动服务器..." -ForegroundColor Yellow
Write-Host "应用地址: http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "提示: 按 Ctrl+C 可停止服务器" -ForegroundColor Gray
Write-Host ""

# 启动HTTP服务器
python -m http.server 5173