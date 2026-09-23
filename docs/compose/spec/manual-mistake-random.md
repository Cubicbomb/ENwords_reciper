---
feature: manual-mistake-random
status: in-progress
updated: 2026-09-23
branch: main
commits: ce1aa23..  # filled at delivery
---

# 手动摘录错词 + 学习队列随机出现

## Report

## [S1] Problem

1. 错词本目前只能由答题记录派生（最近一次 `rating <= 2`）。用户无法主动把想复习的词摘进错词本，尽管数据模型已定义 `Flag(mistake)` 且 `flags` 表已存在。错词本页的「移除」只改内存，刷新后日志派生的词会回来。
2. `buildQueue` 按 rank/due 确定性排序：新词永远取固定前 15 个，同一学习状态下每次会话顺序完全相同，缺乏随机感。

## [S2] Design

### 手动摘录错词（仅错词本页入口）

**数据契约**

- 手动摘录 = `put(db, 'flags', createFlag(wordId, 'mistake'))`，复用现有 `flags` 表（keyPath `['wordId','type']`）与 `createFlag` 工厂，无 schema 迁移。
- 错词本成员 = `Flag(mistake)` ∪ `{wordId | 该词最近一次 log.rating <= 2}`，再排除带 `Flag(ignore)` 的词（tech-plan §3.5：`ignore` = 不再出现）。
- **移除**
  - 已摘录（有 `Flag(mistake)`）：`remove(db, 'flags', [wordId, 'mistake'])`；若同时是日志派生，还须 `put Flag(ignore)` 防止刷新后由日志复活。
  - 仅日志派生：`put(db, 'flags', createFlag(wordId, 'ignore'))`，持久抑制。
- **添加时**：若存在 `Flag(ignore)` 则先删除该 ignore，再写入 `Flag(mistake)`，保证摘录后必定显示。

**纯函数（可 Node 测试）**

新增 `src/domain/mistakes.js`：

```js
/**
 * @param {{ words: Word[], logs: Log[], flags: Flag[] }} input
 * @returns {Array<{ word: Word, manual: boolean, wrongCount: number, lastWrongAt: number }>}
 * 成员 = Flag(mistake) ∪ (最近 log.rating<=2 且无 Flag(ignore))；
 * manual=true 当且仅当存在 Flag(mistake)；按 lastWrongAt/updatedAt 降序。
 */
export function computeMistakeEntries({ words, logs, flags })
```

- `wrongCount`：该 wordId 在 logs 中 `rating<=2` 的次数（无日志的纯手动词为 0）。
- `lastWrongAt`：最近一次 `rating<=2` 的 ts；纯手动词用 `Flag.updatedAt`。
- 输入原样返回新数组，不修改入参。

**错词本页 UI（`src/views/mistakes.js`）**

- 列表上方：文本输入 +「添加」按钮（Enter 同提交）。
- 提交流程：`wordId(输入)` → `get(db,'words',id)`；词不存在 → toast「词库中不存在该词」；已在错词本 → toast「已在错词本中」；否则删 ignore（若有）+ 写 `Flag(mistake)` → 刷新列表。
- 列表项：`manual` 为真时显示 `tag`「已摘录」；「移除」按上述持久化规则执行，成功后刷新列表（重读 flags/logs）。
- 加载：`getAll(words/logs/flags)` → `computeMistakeEntries`。

**备份**：`export.js` 已导入导出 `flags`，无需改动。

### 学习队列组内乱序（默认开启）

**契约变更（`src/domain/queue.js`）**

- `buildQueue(cards, now, config)` 的 `config` 增加可选 `rng?: () => number`，默认 `Math.random`；新增导出纯函数 `shuffle(arr, rng)`（Fisher-Yates，返回新数组）。
- 分类与限流后的组内顺序改为：

| 组 | 入选规则 | 呈现顺序 |
|---|---|---|
| review（due<=now） | 按 due 升序取前 `maxReviewPerDay`（保留最逾期优先入选） | 对入选子集 `shuffle` |
| relearning | 全量 | `shuffle` |
| learning | 全量 | `shuffle` |
| new | `shuffle` 后取前 `newPerDay`（随机抽样，非固定前 rank） | 即抽样结果 |

- 拼接优先级不变：`review → relearning → learning → new`，再 `slice(0, maxSessionSize)`。
- 始终开启，无设置开关。`study.js` 已调用 `buildQueue`，无需改视图调用方。
- `quiz.js` 已自行 shuffle，不在本次范围。

**测试策略**

- `tests/queue.test.js` 现内联 `buildQueue`：改为 `import { buildQueue, shuffle } from '../src/domain/queue.js'`（Node 24 可解析 ESM），消除双份实现漂移；其余用例保持。
- 新增用例：固定 `rng` 序列断言组内顺序与新词抽样成员；默认 rng 下断言组间优先级、限流计数、集合不变性（成员集合与改造前一致）。
- `tests/mistakes.test.js`（新建）：覆盖手动∪日志、ignore 抑制、双标记移除语义、wrongCount、空输入。

## [S3] Out of Scope

- 学习会话 / 词书库中的摘录入口（用户仅选错词本页）。
- 随机顺序的设置开关；quiz 队列改动。
- `star` 标记 UI、出狱规则（streak>=2）重构。
- 备份格式变更、schema 版本升级、npm 依赖。
- 与本需求无关的 flash/键盘问题修复。
- README/用户文档大改（可在交付后补一行）。

## Tasks

- [ ] T1: 新增 `src/domain/mistakes.js` 的 `computeMistakeEntries` + `tests/mistakes.test.js` — acceptance: `node tests/mistakes.test.js` 全绿，覆盖并集/ignore/手动计数 (covers: S2 手动摘录纯函数)
- [ ] T2: `queue.js` 增加 `shuffle` 与 `config.rng`，按表实现组内乱序；`tests/queue.test.js` 改为 import 真源并补随机用例 — acceptance: `node tests/queue.test.js` 全绿，固定 rng 可断言顺序，默认 rng 组间优先级与限流不变 (covers: S2 随机队列; depends: —)
- [ ] T3: 重写 `mistakes.js` 视图：加载 flags、添加输入、已摘录 tag、持久移除 — acceptance: 手动添加刷新后仍在；移除日志词刷新后不复活；移除手动词 flag 删除；词不存在/toast 提示正确 (covers: S2 错词本 UI; depends: T1)
- [ ] T4: 全量回归 + 浏览器冒烟 — acceptance: AGENTS.md 五条测试命令全过；本地 `python -m http.server 5173` 下完成摘录→刷新→移除与连续两次学习会话顺序不同的手工检查 (covers: S2; depends: T2, T3)
