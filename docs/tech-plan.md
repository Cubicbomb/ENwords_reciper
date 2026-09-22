# CET4 背单词应用 · 技术方案

> 目标形态：**极简、可携带（portable）的纯前端 Web 应用**
> 硬约束：无后端、无账号、无同步、无 npm 运行时依赖

---

## 0. 一句话技术路线

**零构建 · 零依赖 · 零后端的三零静态 Web 应用**：原生 ES Modules + IndexedDB + 自研 SM-2 调度器，
开发态多文件、发布态内联成单个 `index.html`，双击即用。

### 关键取舍

| 候选 | 结论 | 理由 |
|---|---|---|
| React / Vue / Preact | ❌ 不用 | 框架与 CDN 依赖破坏离线与可携带性；用 ~80 行 `h()` 视图工具替代 |
| Vite / Webpack | ❌ 不用 | 引入 `node_modules`（百 MB 级）且产物仍需 HTTP 服务，与"精简"目标直接冲突 |
| TypeScript 编译 | ❌ 不编译 | 改用 **JSDoc + `jsconfig.json` 的 `checkJs`**：编辑器里照样有类型检查与补全，运行时零成本、零构建 |
| Tailwind / UI 库 | ❌ 不用 | 单个 CSS 文件 + CSS 变量即可支撑全部界面 |
| IndexedDB 封装库 (idb) | ❌ 不用 | 自己写 ~120 行 Promise 包装 |
| 单元测试框架 (jest/vitest) | ❌ 不用 | Node 24 内置 `node --test`，零依赖 |
| 后端 + 账号同步 | ❌ 明确不做 | 用户已确认"完全不需要" |

**唯一允许的可选依赖**：Excel 导入（SheetJS）与 `.apkg`（Anki）解析——作为 M6 的可选增强，
以懒加载方式按需注入，不进入主包。

---

## 1. 目录结构

```
ENwords_reciper/
├─ index.html                 # 唯一入口：<div id="app"> + <script type="module" src="src/main.js">
├─ manifest.webmanifest       # PWA 清单
├─ sw.js                      # Service Worker（离线缓存）
├─ jsconfig.json              # checkJs，编辑器类型检查（不参与运行时）
├─ styles/
│  ├─ base.css                # reset + CSS 变量 + 布局 + 主题
│  └─ modes.css               # 各背诵模式的专用样式
├─ src/
│  ├─ main.js                 # 启动 + 哈希路由
│  ├─ ui/
│  │  ├─ dom.js               # h() / mount / toast / 进度条 / 确认框（~80 行）
│  │  └─ speech.js            # speechSynthesis 封装（词条发音）
│  ├─ store/
│  │  ├─ db.js                # IndexedDB Promise 封装 + schema 迁移
│  │  ├─ repo.js              # 领域读写：words / decks / cards / logs / flags / settings
│  │  └─ state.js             # 内存态 + 订阅通知 + 会话态（当前队列、游标、暂存作答）
│  ├─ domain/
│  │  ├─ model.js             # JSDoc 类型定义 + 工厂函数 + 校验/归一化
│  │  ├─ scheduler.js         # ★ SRS 纯函数：grade(card, rating, now) -> card'
│  │  ├─ queue.js             # 出题队列构建：到期 / 新词限流 / 错词 / 混排策略
│  │  └─ stats.js             # 统计、留存预测、日历热力
│  ├─ modes/                  # ★ 每种背诵方式一个模块，统一接口
│  │  ├─ flash.js             # 卡片翻面自评
│  │  ├─ choice.js            # 选义 / 选词（en2cn、cn2en 双向）
│  │  ├─ spell.js             # 拼写（带容错判定）
│  │  ├─ cloze.js             # 例句挖空
│  │  ├─ listen.js            # 听音选词 / 听写
│  │  └─ index.js             # 模式注册表 + 能力降级调度
│  ├─ views/                  # 页面级视图
│  │  ├─ home.js  library.js  study.js  quiz.js
│  │  ├─ mistakes.js  import.js  stats.js  settings.js
│  └─ io/
│     ├─ parse.js             # CSV / TSV / TXT / JSON 解析 + 字段嗅探
│     ├─ export.js            # 全量 JSON 备份与恢复（merge / replace）
│     └─ builtin.js           # 内置词表懒加载
├─ data/
│  └─ cet4.json               # 内置 CET4 词表（首次启动可选导入）
├─ tools/
│  └─ bundle.mjs              # 内联成 dist/index.html（~60 行，零依赖）
├─ tests/                     # node --test
│  ├─ scheduler.test.js  queue.test.js  parse.test.js  spell.test.js
└─ docs/tech-plan.md
```

**分层原则**：`domain/` 全部是纯函数，不碰 DOM、不碰 IO → 可直接被 `node --test` 覆盖。
`store/` 是唯一的持久化出口。`modes/` 与 `views/` 只做渲染与交互。

---

## 2. 数据模型

```js
/** 词条：词书无关的唯一实体，按归一化 lemma 去重 */
Word = {
  id: string,              // lemma.toLowerCase() 归一后的稳定主键
  lemma: string,
  phonetic: { uk?: string, us?: string },
  senses: [ { pos: 'n.', defCn: string, defEn?: string } ],
  examples: [ { en: string, cn?: string } ],
  tags: string[],          // ['cet4', 'core', 'unit-03']
  rank?: number,           // 词表顺序/词频位次：用于抽干扰项、排新词
  audio?: { uk?: string, us?: string }   // 缺失时回退 TTS
}

/** 词书：只存引用，不复制词条 → 多词书共享同一份 Word 与学习进度 */
Deck = { id, name, source: 'builtin'|'import', createdAt, wordIds: string[] }

/** SRS 卡片：wordId × deckId 的学习状态 */
Card = {
  id: `${deckId}:${wordId}`,
  deckId, wordId,
  state: 'new' | 'learning' | 'review' | 'relearning' | 'suspended',
  due: number,             // epoch ms
  intervalDays: number,
  ease: number,            // SM-2 难度因子，初始 2.5
  reps: number,
  lapses: number,
  streak: number,          // 连续答对次数 → 错词"出狱"判定
  lastReview?: number
}

/** 复习流水：追加写，是统计与错题的唯一事实来源 */
Log = { id, ts, cardId, wordId, deckId, mode, rating: 1|2|3|4, correct: boolean, ms, answer? }

/** 用户标记：star=收藏, mistake=手动加入错词本, ignore=不再出现 */
Flag = { wordId, type, updatedAt }
```

### 三条建模决策

1. **错词本不建表**，由 `Log` 派生（最近一次 `rating <= 2` 或自测答错）∪ `Flag(mistake)`。
   避免"两份真值"导致的错词取消失败、状态漂移。
2. **Card 与 Word 分离**：同一单词在不同词书里进度独立、词条数据共享。
3. **Log 只追加不修改**：任何统计都可从 Log 重算，等于自带一份审计日志；
   导入/恢复后也能重建 `Card`。

### IndexedDB schema

库名 `cet4`，object stores：

| store | keyPath | 索引 |
|---|---|---|
| `words` | `id` | `lemma`, `rank` |
| `decks` | `id` | — |
| `cards` | `id` | `deckId`, `due`, `[deckId, due]`, `state` |
| `logs` | `id` (自增) | `ts`, `wordId`, `cardId` |
| `flags` | `[wordId, type]` | `wordId` |
| `meta` | `key` | — （settings、schemaVersion、lastExportAt） |

版本迁移集中写在 `db.js` 的 `onupgradeneeded` 中，按 `oldVersion` 逐级升级。

---

## 3. 核心算法

### 3.1 间隔重复调度（`scheduler.js`）

**v1 用 SM-2，接口先行，v2 换 FSRS——函数签名不变。**

```js
/**
 * @param {Card} card
 * @param {1|2|3|4} rating   1=重来 2=模糊 3=认识 4=简单
 * @param {number} now
 * @returns {Card}  新卡（纯函数，不修改入参）
 */
export function grade(card, rating, now) { /* ... */ }
```

- `rating=1` → `state='relearning'`，`intervalDays=0`（当日重现），`ease -= 0.2`（下限 1.3），`lapses++`
- `rating=2` → `ease -= 0.15`，`interval *= 1.2`
- `rating=3` → 首答 1 天，次答 3 天，之后 `interval *= ease`
- `rating=4` → 同上但 `ease += 0.15`，`interval *= ease * 1.3`
- 所有 interval 乘 `fuzz`（±5% 随机抖动），避免同批词永远挤在同一天

**为什么留接口不直接上 FSRS**：FSRS（log-logistic 记忆模型，约 17 个权重）在同等留存率下能把
复习量降 20–30%，但它需要**每用户参数拟合**才有优势；冷启动阶段用 SM-2 更可解释、更易调试。
把调度器做成纯函数后，切换成本 ≈ 换一个文件 + 跑一遍 tests。

### 3.2 队列与限流（`queue.js`）

优先级：**逾期最久的 review → relearning → 新词（受 `newPerDay` 限流）**。

- 默认 `newPerDay = 15`、`maxReviewPerDay = 120`；超限的到期卡顺延次日
- 这条限流是**防雪崩的关键**：一旦积压 500 张到期卡，无限放行会让用户直接弃用
- 学习会话只把队列里的前 ~50 个词载入内存，不整表加载（5000 词词表也不卡）

**混排策略**：默认以 `flash` 打底，每 4 张插入 1 个产出型模式（`choice` / `spell`）。
这是刻意制造"合意困难"（desirable difficulty）——识别（再认）远比回忆容易，
纯翻卡会产生"我很熟"的错觉，混入输出型题目才能真实检验掌握度。

### 3.3 六种背诵方式（统一接口）

```js
/**
 * @typedef Mode
 * @property {string}   id
 * @property {string}   name
 * @property {string[]} requires      // 如 ['examples']，数据缺失时自动跳过该模式
 * @property {(word: Word, ctx: ModeCtx) => ModeItem} build
 *
 * @typedef ModeItem
 * @property {Node} question
 * @property {Node} answer
 * @property {(input: any) => 1|2|3|4} check   // 映射到 SRS rating
 */
```

`ModeCtx` 注入：干扰项池、可播种的随机源（便于测试复现）、发音函数、词表统计。

| # | 模式 | 机制 | 数据要求 |
|---|---|---|---|
| 1 | `flash` | 看词 → 翻面自评「认识 / 模糊 / 不认识」→ 映射 3/2/1 | 无（保底模式） |
| 2 | `choice-en2cn` | 4 选 1 选中文义；干扰项从「同词性 + `rank` 邻近 ±500 + 非同义」采样，选项顺序打散 | senses |
| 3 | `choice-cn2en` | 反向：给中文选单词 | senses |
| 4 | `spell` | 给中文义 + 首字母 + 长度槽位；Levenshtein ≤ 1 判为「接近」→ rating 2（不算错） | lemma |
| 5 | `cloze` | 例句遮蔽目标词（词干匹配处理词形变化）；无例句自动降级为 `choice` | examples |
| 6 | `listen` | 听音选词 / 听写。优先 `audio`，否则 `speechSynthesis`；系统无英文语音时自动跳过 | — |

**不做图片记忆法（百词斩式）**：它需要一套词–图映射资源，与"精简 / portable"直接冲突。
替代方案：emoji 或图标 + 词根词缀提示（M6 可选）。

### 3.4 自测（`quiz`）

- 范围：整本词书 / 最近 N 天学过的 / 错词本；参数：题量、题型混合比例
- 一次性出卷 → 逐题作答（**不即时反馈**）→ 交卷统一评分
- 交卷后**批量**写 `Log` 并更新 `Card`：`rating = correct ? 3 : 1`
- 与"学习中即时反馈"区分开：两者复用同一套 `modes/`，差别只在驱动方式（即时 vs 批量）

### 3.5 错词复习

- **虚拟词书** = `Flag(mistake)` ∪ `Log` 中最近一次 `rating <= 2` 的词
- **出狱规则**：`streak >= 2`（连续答对 2 次）或当前间隔 ≥ 7 天 → 自动移出错词本
- 手动星标 `star` 的词永久保留在复习池，不受出狱规则影响

---

## 4. 导入 / 导出

### 4.1 词表导入（`io/parse.js`，纯前端）

| 格式 | 处理 |
|---|---|
| `.csv` / `.tsv` | 表头自动嗅探：`word/单词/term`、`def/释义/meaning/cn`、`phonetic/音标`、`example/例句`；无表头时按「单词 + 释义」两列推断 |
| `.txt` | 逐行 `单词 <TAB 或空格> 释义`；纯单词列表也可（释义留空，标记为"待补全"） |
| `.json` | 本应用导出格式，或 `[{ word, def }]` |

流程：读取 → 嗅探 → **字段映射预览表（确认后才写库）** → 去重合并 → 写入。
去重规则：`lemma.toLowerCase()` 归一（去首尾空格、去 `to ` 前缀）；
重复时**合并 senses/examples** 而不是覆盖。大文件用 `File.stream()` 分块解析以免卡 UI。

### 4.2 备份与恢复（`io/export.js`）

- 导出：全量 JSON（words / decks / cards / logs / flags / settings）经 `Blob` 下载
- 导入：`merge`（按 id 合并，保留较新状态）或 `replace`（清库重建）两种策略
- 启动时若 `lastExportAt` 超过 7 天，提示导出一份
- 不使用 localStorage 存业务数据（容量仅 ~5MB），仅 settings 存 `meta`

---

## 5. 可携带性与离线

**主形态 = PWA**（推荐）：`manifest.webmanifest` + `sw.js`。
Service Worker 在 `install` 时 `caches.addAll` 全部静态资源，导航请求走 cache-first + 后台更新。
手机浏览器打开 → 添加到主屏幕 → 全屏离线运行，无网络也能背。

**备选形态 = 单文件**：`node tools/bundle.mjs` 把 JS/CSS/词表全部内联成 `dist/index.html`，
双击打开即可用于演示或拷贝给他人。

> ⚠️ 单文件形态的取舍：浏览器对 `file://` 源的 IndexedDB 支持不一致（Chrome/Firefox 可用但属灰色地带），
> 因此单文件版内置 **localStorage 兜底 + 显眼提示导出**。
> **建议以 PWA 为正式形态，单文件作为应急/分享形态。**

**关于发音**：不打包 mp3（体积与版权都是负担），统一走 `speechSynthesis`；
确实需要稳定音质时，在 M6 做"预生成音频缓存"（用户主动触发生成并存入 IndexedDB）。

---

## 6. 里程碑

| 阶段 | 内容 | 估时 | 完成标志 |
|---|---|---|---|
| **M0 骨架** | `index.html` + `ui/dom.js` + 哈希路由 + `store/db.js` + 30 词样例数据 | 0.5d | 能跑通 `flash` 模式并把 Card 落进 IndexedDB |
| **M1 导入与词库** | `io/parse.js` 三格式 + 字段映射预览 + `library` 列表/搜索 | 1d | 导入一份真实 CET4 词表（~4500 词）不卡 UI |
| **M2 调度与出题** | `scheduler.js`(SM-2) + `queue.js` 限流 + 学习会话 UI + 到期计数 | 1d | 连续 3 天模拟复习，interval 与 due 计算符合预期 |
| **M3 多模式** | `choice` ×2 / `spell` / `cloze` / `listen` + 混排策略 + 能力降级 | 1.5d | 同一批词能切换 5 种模式，缺数据时自动跳过而非报错 |
| **M4 自测与错词** | 出卷/交卷批量评分 + `mistakes` 虚拟词书 + 出狱规则 + `stats`（内联 SVG 图表） | 1d | 答错的词自动进错词本，连对 2 次后自动移出 |
| **M5 便携化** | `bundle.mjs` 单文件 + PWA + 导入导出 + 空状态/错误兜底 | 0.5d | 手机添加到主屏后断网仍可完整背诵 |
| **M6 增强（可选）** | FSRS 替换 SM-2 / 词根词缀提示 / TTS 音频缓存 / Excel·apkg 导入 | — | 按需 |

**合计约 5.5 人天**到 M5。

### 测试策略

`domain/` 与 `io/` 全是纯函数，用内置 `node --test` 直接测，零依赖：

- `scheduler.test.js`：`rating=1` 后的当日重现、`rating=4` 跳级、跨天 `due` 计算、`ease` 上下限
- `queue.test.js`：`newPerDay` / `maxReviewPerDay` 限流边界、优先级顺序
- `parse.test.js`：各格式 + 无表头 + BOM + CRLF + 中文字段名嗅探
- `spell.test.js`：Levenshtein 判定「接近 / 错误」的边界

### 本地开发命令

```bash
python -m http.server 5173     # 起静态服务（ES Modules 需要 http，不能 file://）
node --test tests/             # 跑测试
node tools/bundle.mjs          # 产出 dist/index.html 单文件
```

---

## 7. 风险与对策

| 风险 | 影响 | 对策 |
|---|---|---|
| **词表版权与来源** | 阻塞 M1 | 使用公开/开源 CET4 词表并核对词数（约 4500），不抓取商业词书内容。**M1 开工前必须先确认数据源** |
| 缺例句 / 缺音标 | cloze、listen 不可用 | 每个模式声明 `requires`，运行时自动降级；UI 明示"该词暂无例句" |
| `file://` 或隐私模式下 IndexedDB 不可用 | 单文件版数据丢失 | 特性探测 → localStorage 兜底 → 顶部横幅强提示导出 |
| 复习积压导致弃用 | 产品失败的主因 | `maxReviewPerDay` 限流 + 顺延；首页显著展示"今日到期"而非"总积压" |
| **范围蔓延** | 破坏"精简 portable"目标 | 见下方非目标清单，v1 一律不做 |

## 8. 明确的非目标（v1）

- ❌ 账号体系、云同步、多端进度合并
- ❌ 排行榜、打卡社交、学习小组
- ❌ 图片记忆法、AI 生成例句/释义
- ❌ 原生 App（iOS / Android）、微信小程序
- ❌ 任何形式的后端服务与数据库
