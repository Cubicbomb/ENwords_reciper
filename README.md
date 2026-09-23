# CET4 背单词

零构建、零依赖、零后端的纯前端背单词应用，内置 4544 个 CET4 词汇。

## 启动

```bash
python -m http.server 5173
# 浏览器打开 http://localhost:5173
```

首次打开自动加载词表并写入 IndexedDB，之后无需联网。

## 背诵模式

| 模式 | 说明 |
|------|------|
| 卡片翻转 | 默认模式，自评认识/模糊/不认识 |
| 选择题 | 英文选中文 / 中文选英文 |
| 拼写 | 给释义 + 首字母提示，输入拼写（Levenshtein 容错） |
| 例句填空 | 遮蔽目标词，无例句时自动降级为选择题 |
| 听音选词 | TTS 朗读 + 4 选 1 |

每 5 张自动插入 1 个输出型题型（选择/拼写/填空），防止再认幻觉。

## 技术栈

- 原生 ES Modules，无构建工具
- IndexedDB 存储，纯前端
- SM-2 间隔重复算法（纯函数，可测试）
- CSS 变量 + 移动端优先

## 项目结构

```
├─ index.html              入口
├─ src/
│  ├─ main.js              路由 + 启动
│  ├─ ui/dom.js            h() 视图函数 + 组件
│  ├─ store/db.js          IndexedDB 封装
│  ├─ domain/
│  │  ├─ model.js          数据模型 + 归一化
│  │  └─ scheduler.js      SM-2 算法
│  ├─ modes/               背诵模式
│  │  ├─ shared.js         共享工具（按钮/守卫/类型）
│  │  ├─ flash/choice/spelling/cloze/listen
│  │  └─ index.js          注册表 + 自动选模式
│  └─ views/               页面视图
├─ data/cet4.json          4544 词词表
├─ styles/base.css         样式
├─ tests/                  纯函数测试
└─ docs/tech-plan.md       技术方案
```

## 测试

```bash
node tests/scheduler.test.js   # SM-2 算法
node tests/normalize.test.js   # 词条归一化
```

## 后续

- [ ] 词表导入（CSV/TXT/JSON）
- [ ] 错词本 & 自测
- [ ] PWA 离线 + 单文件打包
- [ ] FSRS 算法
