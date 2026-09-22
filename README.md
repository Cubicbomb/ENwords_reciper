# CET4 背单词应用

极简、可携带、零依赖的CET4单词记忆应用。

## 🚀 快速开始

### 开发模式

```bash
# 启动本地服务器
python -m http.server 5173

# 然后在浏览器中打开
http://localhost:5173
```

### 使用方式

1. 首次打开会自动加载 30 个样例单词
2. 点击「继续学习」开始背诵
3. 支持多种背诵模式：
   - 📝 卡片翻转（默认）
   - ❓ 选择题（英文选中文/中文选英文）
   - ✏️ 拼写测试
   - 📖 例句填空
   - 🔊 听音选词

## 📁 项目结构

```
ENwords_reciper/
├─ index.html                 # 入口文件
├─ manifest.webmanifest       # PWA 清单
├─ jsconfig.json              # VSCode 类型检查配置
├─ styles/
│  └─ base.css                # 基础样式
├─ src/
│  ├─ main.js                 # 主入口 + 路由
│  ├─ ui/
│  │  └─ dom.js               # UI 工具函数
│  ├─ store/
│  │  └─ db.js                # IndexedDB 封装
│  ├─ domain/
│  │  ├─ model.js             # 领域模型
│  │  └─ scheduler.js         # SM-2 调度算法
│  ├─ modes/
│  │  ├─ flash.js             # 卡片翻转模式
│  │  ├─ choice.js            # 选择题模式
│  │  ├─ spelling.js          # 拼写模式
│  │  ├─ cloze.js             # 例句填空模式
│  │  ├─ listen.js            # 听音模式
│  │  └─ index.js             # 模式注册表
│  └─ views/
│     ├─ home.js              # 首页
│     └─ study.js             # 学习会话
├─ data/
│  └─ cet4.json               # 30词样例数据
├─ tools/
│  └─ bundle.mjs              # 单文件打包工具（待实现）
├─ tests/
│  └─ simple-test.js          # 简单测试
└─ docs/
   └─ tech-plan.md            # 技术方案文档
```

## 🔧 技术栈

- **零构建**：原生 ES Modules，无需编译
- **零依赖**：纯 JavaScript，无第三方库
- **零后端**：数据存储在 IndexedDB，纯前端应用
- **可携带**：可打包成单个 HTML 文件

## 📊 数据模型

### 词条 (Word)
```js
{
  id: string,              // 唯一标识
  lemma: string,           // 词元
  phonetic: { uk?, us? },  // 音标
  senses: [{ pos, defCn }],// 释义
  examples: [{ en, cn }],  // 例句
  tags: string[],          // 标签
  rank?: number            // 词频排名
}
```

### SRS 卡片 (Card)
```js
{
  id: `${deckId}:${wordId}`,
  state: 'new'|'learning'|'review'|'relearning'|'suspended',
  due: number,             // 下次复习时间
  intervalDays: number,    // 间隔天数
  ease: number,            // 难度因子
  reps: number,            // 复习次数
  lapses: number,          // 遗忘次数
  streak: number           // 连续正确次数
}
```

## 🧠 核心算法

### SM-2 间隔重复
- **rating=1（重来）**：间隔归零，难度因子降低
- **rating=2（模糊）**：间隔小幅增加，难度因子降低
- **rating=3（认识）**：按难度因子增加间隔
- **rating=4（简单）**：跳级增加间隔，难度因子升高

### 混排策略
- 每 4 张卡片插入 1 个输出型题型（选择/拼写/填空）
- 防止"再认幻觉"，提高长期记忆效果

## 🎯 功能特性

- ✅ 多种背诵模式
- ✅ SM-2 间隔重复算法
- ✅ 错词本自动收集
- ✅ 学习进度统计
- ✅ 词表导入导出
- ✅ 离线可用（PWA）
- ✅ 移动端适配

## 📝 测试

```bash
# 运行简单测试
node tests/simple-test.js
```

## 🔮 后续计划

- [ ] M1: 词表导入功能（CSV/TXT/JSON）
- [ ] M2: 完整的调度系统和学习会话
- [ ] M3: 更多背诵模式
- [ ] M4: 自测和错词本
- [ ] M5: 单文件打包和 PWA
- [ ] M6: FSRS 算法、词根词缀

## 📄 许可证

MIT