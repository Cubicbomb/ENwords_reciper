#!/bin/bash

echo "========================================"
echo "  CET4 背单词应用启动脚本"
echo "========================================"
echo

echo "正在启动本地服务器..."
echo "应用地址: http://localhost:5173"
echo

echo "请选择启动方式:"
echo "1. Python服务器（推荐）"
echo "2. Node.js服务器"
echo "3. 退出"
echo

read -p "请输入选择 (1-3): " choice

if [ "$choice" = "1" ]; then
    echo
    echo "启动Python服务器..."
    python -m http.server 5173
elif [ "$choice" = "2" ]; then
    echo
    echo "启动Node.js服务器..."
    npx http-server -p 5173
elif [ "$choice" = "3" ]; then
    echo
    echo "退出程序。"
    exit 0
else
    echo
    echo "无效选择，请重新运行脚本。"
    exit 1
fi

echo
echo "服务器已启动，请在浏览器中访问: http://localhost:5173"
echo "按 Ctrl+C 停止服务器。"