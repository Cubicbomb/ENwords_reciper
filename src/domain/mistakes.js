/**
 * 错词本成员计算：Flag(mistake) ∪ 日志派生，ignore 抑制
 * 纯函数，不碰 IO，可被 node --test 覆盖
 */

/**
 * @typedef {import('./model.js').Word} Word
 * @typedef {import('./model.js').Log} Log
 * @typedef {import('./model.js').Flag} Flag
 */

/**
 * @typedef {Object} MistakeEntry
 * @property {Word} word
 * @property {boolean} manual - 是否手动摘录（存在 Flag mistake）
 * @property {boolean} logDerived - 是否因最近一次 log.rating<=2 且无 ignore 而入选
 * @property {number} wrongCount - logs 中 rating<=2 的次数
 * @property {number} lastWrongAt - 最近一次错的时间戳（无日志用 flag.updatedAt）
 */

/**
 * 计算错词本条目
 * 成员 = Flag(mistake) ∪ {最近一次 log.rating <= 2 且无 Flag(ignore)}
 * @param {{ words: Word[], logs: Log[], flags: Flag[] }} input
 * @returns {MistakeEntry[]} 按 lastWrongAt 降序的新数组（不修改入参）
 */
export function computeMistakeEntries({ words, logs, flags }) {
  const wordById = new Map((words || []).map(w => [w.id, w]));
  const mistakeIds = new Set();
  const ignoreIds = new Map(); // wordId -> updatedAt

  for (const flag of flags || []) {
    if (flag.type === 'mistake') mistakeIds.add(flag.wordId);
    else if (flag.type === 'ignore') ignoreIds.set(flag.wordId, flag.updatedAt || 0);
  }

  // 按时间升序处理：wrongCount 统计所有 rating<=2；latestRating 保留最近一次
  const wrongCount = new Map();
  const lastWrongAt = new Map();
  const latestRating = new Map();
  const sortedLogs = [...(logs || [])].sort((a, b) => a.ts - b.ts);
  for (const log of sortedLogs) {
    latestRating.set(log.wordId, log.rating);
    if (log.rating <= 2) {
      wrongCount.set(log.wordId, (wrongCount.get(log.wordId) || 0) + 1);
      lastWrongAt.set(log.wordId, log.ts);
    }
  }

  const mistakeUpdatedAt = new Map();
  for (const flag of flags || []) {
    if (flag.type === 'mistake') mistakeUpdatedAt.set(flag.wordId, flag.updatedAt || 0);
  }

  /** @type {Set<string>} */
  const memberIds = new Set();
  const logDerivedIds = new Set();

  // 日志派生：最近一次 rating<=2 且未 ignore
  for (const [id, rating] of latestRating) {
    if (rating <= 2 && !ignoreIds.has(id)) {
      memberIds.add(id);
      logDerivedIds.add(id);
    }
  }

  // 手动摘录始终在（摘录时会删 ignore，此处兜底）
  for (const id of mistakeIds) memberIds.add(id);

  const entries = [];
  for (const id of memberIds) {
    const word = wordById.get(id);
    if (!word) continue;
    const manual = mistakeIds.has(id);
    const count = wrongCount.get(id) || 0;
    const ts = lastWrongAt.get(id) ?? mistakeUpdatedAt.get(id) ?? 0;
    entries.push({
      word,
      manual,
      logDerived: logDerivedIds.has(id),
      wrongCount: count,
      lastWrongAt: ts
    });
  }

  entries.sort((a, b) => b.lastWrongAt - a.lastWrongAt);
  return entries;
}
