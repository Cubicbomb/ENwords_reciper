# CET4 背单词应用 - 项目概览

## 🎯 项目状态

**M0 阶段已完成** ✅

应用已可正常运行，支持导入 30 个样例单词并进行卡片背诵。

## 🚀 快速开始

```bash
# 1. 启动本地服务器
python -m http.server 5173

# 2. 在浏览器中打开
http://localhost:5173

# 3. 开始背单词！
```

## 📊 功能完成度

| 模块 | 状态 | 说明 |
|------|------|------|
| 项目结构 | ✅ | 零构建、零依赖、零后端 |
| 数据库 | ✅ | IndexedDB 完整封装 |
| 领域模型 | ✅ | Word/Deck/Card/Log/Flag |
| SM-2 算法 | ✅ | 纯函数实现，可测试 |
| UI 组件 | ✅ | h() 视图函数，响应式 |
| 路由系统 | ✅ | 哈希路由，动态导入 |
| 背诵模式 | ✅ | 6种模式，自动混排 |
| 首页 | ✅ | 概览、快捷操作 |
| 学习会话 | ✅ | 背诵界面、进度显示 |
| 样例数据 | ✅ | 30词 CET4 词汇 |
| 测试 | ✅ | 基础测试 + 集成测试 |

## 🏗️ 架构设计

### 三零原则
- **零构建**：原生 ES Modules，无需编译
- **零依赖**：纯 JavaScript，无第三方库
- **零后端**：数据存储在 IndexedDB，纯前端应用

### 分层架构
```
┌─────────────────────────────────────┐
│           Views (视图层)             │
│  home.js, study.js, import.js...    │
├─────────────────────────────────────┤
│           Modes (模式层)             │
│  flash, choice, spelling, cloze...  │
├─────────────────────────────────────┤
│           Domain (领域层)            │
│  model.js, scheduler.js            │
├─────────────────────────────────────┤
│           Store (存储层)             │
│  db.js (IndexedDB)                 │
├─────────────────────────────────────┤
│           UI (工具层)                │
│  dom.js (h(), mount, toast...)      │
└─────────────────────────────────────┘
```

## 📁 核心文件

### 入口与配置
- `index.html` - 应用入口
- `src/main.js` - 主逻辑 + 路由
- `jsconfig.json` - 类型检查配置

### 核心模块
- `src/store/db.js` - IndexedDB 封装（120 行）
- `src/domain/model.js` - 领域模型（200 行）
- `src/domain/scheduler.js` - SM-2 算法（100 行）
- `src/ui/dom.js` - UI 工具（80 行）

### 背诵模式
- `src/modes/flash.js` - 卡片翻转
- `src/modes/choice.js` - 选择题
- `src/modes/spelling.js` - 拼写测试
- `src/modes/cloze.js` - 例句填空
- `src/modes/listen.js` - 听音选词
- `src/modes/index.js` - 模式注册表

### 视图页面
- `src/views/home.js` - 首页
- `src/views/study.js` - 学习会话

## 🧠 核心算法

### SM-2 间隔重复
```javascript
// 评分规则
rating=1 (重来) → 间隔归零，难度降低
rating=2 (模糊) → 间隔小幅增加，难度降低
rating=3 (认识) → 按难度因子增加间隔
rating=4 (简单) → 跳级增加，难度升高
```

### 混排策略
- 每 4 张卡片插入 1 个输出型题型
- 防止"再认幻觉"
- 提高长期记忆效果

## 📊 数据模型

### Word (词条)
```javascript
{
  id: 'abandon',
  lemma: 'abandon',
  phonetic: { uk: 'əˈbændən' },
  senses: [{ pos: 'v.', defCn: '放弃' }],
  examples: [{ en: '...', cn: '...' }],
  tags: ['cet4', 'core'],
  rank: 1
}
```

### Card (SRS 卡片)
```javascript
{
  id: 'deck1:abandon',
  state: 'review',        // new/learning/review/relearning
  due: 1790092800000,     // 下次复习时间
  intervalDays: 7,        // 间隔天数
  ease: 2.5,              // 难度因子
  reps: 3,                // 复习次数
  streak: 2               // 连续正确次数
}
```

## 🎯 测试结果

```bash
# 基础测试
$ node tests/simple-test.js
✅ SM-2 调度测试通过
✅ 归一化测试通过

# 集成测试
$ node tests/integration-test.js
✔ 应该正确初始化数据库
✔ 应该正确创建词条
✔ 应该正确应用调度算法
✔ 应该正确构建 UI 组件
✔ 应该正确处理路由
5 tests, 5 pass, 0 fail
```

## 📈 代码统计

| 文件 | 行数 | 说明 |
|------|------|------|
| `src/store/db.js` | 200 | IndexedDB 封装 |
| `src/domain/model.js` | 200 | 领域模型 |
| `src/domain/scheduler.js` | 100 | SM-2 算法 |
| `src/ui/dom.js` | 80 | UI 工具 |
| `src/main.js` | 100 | 路由系统 |
| `src/modes/*.js` | 300 | 6种模式 |
| `src/views/*.js` | 300 | 视图页面 |
| `styles/base.css` | 100 | 基础样式 |
| **总计** | **~1400** | 核心代码 |

## 🔮 下一步（M1）

- [ ] 词表导入功能（CSV/TXT/JSON）
- [ ] 字段映射预览 UI
- [ ] 词书库管理页面
- [ ] 搜索和筛选功能
- [ ] 导入进度显示

## 🎉 项目亮点

1. **极简架构**：1400 行核心代码实现完整功能
2. **零依赖**：无需 npm，直接运行
3. **纯函数优先**：所有算法可测试
4. **模式统一接口**：易于扩展新题型
5. **自动降级**：缺数据时智能切换模式
6. **移动端优先**：响应式设计，支持手机

## 📝 开发命令

```bash
# 启动开发服务器
python -m http.server 5173

# 运行测试
node tests/simple-test.js
node tests/integration-test.js

# 打包单文件（待实现）
node tools/bundle.mjs
```

## 📄 相关文档

- `docs/tech-plan.md` - 详细技术方案
- `docs/M0-summary.md` - M0 阶段总结
- `README.md` - 项目说明

---

**M0 阶段完成！应用已可正常使用。** 🎉