/**
 * 领域模型：JSDoc 类型定义 + 工厂函数 + 校验/归一化
 * 所有类型定义供编辑器补全与 checkJs 校验使用
 */

/**
 * @typedef {Object} Phonetic
 * @property {string} [uk]
 * @property {string} [us]
 */

/**
 * @typedef {Object} Sense
 * @property {string} pos
 * @property {string} defCn
 * @property {string} [defEn]
 */

/**
 * @typedef {Object} Example
 * @property {string} en
 * @property {string} [cn]
 */

/**
 * @typedef {Object} Audio
 * @property {string} [uk]
 * @property {string} [us]
 */

/**
 * @typedef {Object} Word
 * @property {string} id
 * @property {string} lemma
 * @property {Phonetic} [phonetic]
 * @property {Sense[]} senses
 * @property {Example[]} [examples]
 * @property {string[]} tags
 * @property {number} [rank]
 * @property {Audio} [audio]
 */

/**
 * @typedef {Object} Deck
 * @property {string} id
 * @property {string} name
 * @property {'builtin'|'import'} source
 * @property {number} createdAt
 * @property {string[]} wordIds
 */

/**
 * @typedef {'new'|'learning'|'review'|'relearning'|'suspended'} CardState
 */

/**
 * @typedef {Object} Card
 * @property {string} id
 * @property {string} deckId
 * @property {string} wordId
 * @property {CardState} state
 * @property {number} due
 * @property {number} intervalDays
 * @property {number} ease
 * @property {number} reps
 * @property {number} lapses
 * @property {number} streak
 * @property {number} [lastReview]
 */

/**
 * @typedef {1|2|3|4} Rating
 */

/**
 * @typedef {Object} Log
 * @property {number} id
 * @property {number} ts
 * @property {string} cardId
 * @property {string} wordId
 * @property {string} deckId
 * @property {string} mode
 * @property {Rating} rating
 * @property {boolean} correct
 * @property {number} ms
 * @property {string} [answer]
 */

/**
 * @typedef {'star'|'mistake'|'ignore'} FlagType
 */

/**
 * @typedef {Object} Flag
 * @property {string} wordId
 * @property {FlagType} type
 * @property {number} updatedAt
 */

// ========== 工厂函数 ==========

/**
 * 生成稳定的ID（基于lemma的归一化形式）
 * @param {string} lemma
 * @returns {string}
 */
export function wordId(lemma) {
  return lemma
    .trim()
    .toLowerCase()
    .replace(/^to\s+/, '')  // 去掉 "to " 前缀
    .replace(/\s+/g, ' ');
}

/**
 * 创建词条
 * @param {Partial<Word>} partial
 * @returns {Word}
 */
export function createWord(partial) {
  const lemma = partial.lemma?.trim() || '';
  const id = wordId(lemma);
  
  return {
    id,
    lemma,
    phonetic: partial.phonetic || {},
    senses: partial.senses || [],
    examples: partial.examples || [],
    tags: partial.tags || [],
    rank: partial.rank,
    audio: partial.audio
  };
}

/**
 * 创建词书
 * @param {Partial<Deck>} partial
 * @returns {Deck}
 */
export function createDeck(partial) {
  return {
    id: partial.id || `deck-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: partial.name || '未命名词书',
    source: partial.source || 'import',
    createdAt: partial.createdAt || Date.now(),
    wordIds: partial.wordIds || []
  };
}

/**
 * 创建新的SRS卡片（新词状态）
 * @param {string} deckId
 * @param {string} wordId
 * @returns {Card}
 */
export function createCard(deckId, wordId) {
  return {
    id: `${deckId}:${wordId}`,
    deckId,
    wordId,
    state: 'new',
    due: 0,
    intervalDays: 0,
    ease: 2.5,
    reps: 0,
    lapses: 0,
    streak: 0,
    lastReview: undefined
  };
}

/**
 * 创建复习记录
 * @param {string} cardId
 * @param {string} wordId
 * @param {string} deckId
 * @param {string} mode
 * @param {Rating} rating
 * @param {boolean} correct
 * @param {number} ms
 * @param {string} [answer]
 * @returns {Log}
 */
export function createLog(cardId, wordId, deckId, mode, rating, correct, ms, answer) {
  return {
    id: Date.now() + Math.random(),
    ts: Date.now(),
    cardId,
    wordId,
    deckId,
    mode,
    rating,
    correct,
    ms,
    answer
  };
}

/**
 * 创建用户标记
 * @param {string} wordId
 * @param {FlagType} type
 * @returns {Flag}
 */
export function createFlag(wordId, type) {
  return {
    wordId,
    type,
    updatedAt: Date.now()
  };
}

// ========== 归一化函数 ==========

/**
 * 归一化词条数据
 * @param {any} raw
 * @returns {Word|null}
 */
export function normalizeWord(raw) {
  if (!raw || (!raw.word && !raw.lemma && !raw.term && !raw.单词)) {
    return null;
  }

  const lemma = raw.word || raw.lemma || raw.term || raw.单词 || '';
  
  let senses = [];
  if (raw.def || raw.defCn || raw.释义 || raw.meaning) {
    const def = raw.def || raw.defCn || raw.释义 || raw.meaning || '';
    const pos = raw.pos || raw.词性 || '';
    senses.push({ pos, defCn: def, defEn: raw.defEn });
  } else if (Array.isArray(raw.senses)) {
    senses = raw.senses.map(s => ({
      pos: s.pos || '',
      defCn: s.defCn || s.cn || s.def || '',
      defEn: s.defEn || s.en
    }));
  }

  let examples = [];
  if (raw.example || raw.exampleEn || raw.例句) {
    const en = raw.example || raw.exampleEn || raw.例句 || '';
    const cn = raw.exampleCn || raw.例句译 || '';
    examples.push({ en, cn });
  } else if (Array.isArray(raw.examples)) {
    examples = raw.examples.map(e => ({
      en: e.en || e.example || '',
      cn: e.cn || e.exampleCn
    }));
  }

  let phonetic = {};
  if (raw.phonetic) {
    if (typeof raw.phonetic === 'string') {
      phonetic = { uk: raw.phonetic };
    } else {
      phonetic = raw.phonetic;
    }
  } else if (raw.音标) {
    phonetic = { uk: raw.音标 };
  }

  return createWord({
    lemma,
    senses,
    examples,
    phonetic,
    tags: raw.tags || [],
    rank: raw.rank
  });
}