# 快速参考卡

## 🚀 启动应用
```bash
python -m http.server 5173
# 浏览器打开 http://localhost:5173
```

## 🧪 运行测试
```bash
# 所有测试
node tests/scheduler.test.js && node tests/normalize.test.js && node tests/parse.test.js && node tests/queue.test.js && node tests/modes.test.js

# 单个测试
node tests/scheduler.test.js
```

## 📦 打包单文件
```bash
node tools/bundle.mjs
# 输出 dist/index.html (9.4MB)
```

## 📁 核心文件
- `src/main.js` - 路由入口
- `src/domain/scheduler.js` - 调度算法
- `src/domain/queue.js` - 队列系统
- `src/views/study.js` - 学习会话
- `src/views/quiz.js` - 自测功能
- `src/io/parse.js` - 词表解析

## 🎯 主要功能
1. **学习**：`#/study/{deckId}` - 背诵单词
2. **自测**：`#/quiz` - 测试学习成果
3. **导入**：`#/import` - 导入词表
4. **词书库**：`#/library` - 管理词书
5. **错词本**：`#/mistakes` - 复习错词
6. **设置**：`#/settings` - 导入导出

## 📊 测试覆盖
- 48 个测试用例
- 覆盖调度、解析、队列、模式
- 纯函数可独立测试

## ⚡ 性能
- 首次加载：2-3 秒
- 学习响应：< 100ms
- 单文件：9.4MB
- 内存：< 50MB