/**
 * 出题队列构建：到期 / 新词限流 / 错词 / 混排策略
 * 纯函数，不碰 IO，可直接被 node --test 覆盖
 */

/**
 * @typedef {import('./model.js').Card} Card
 * @typedef {import('./model.js').Word} Word
 */

/**
 * @typedef {Object} QueueConfig
 * @property {number} newPerDay - 每日新词上限
 * @property {number} maxReviewPerDay - 每日复习上限
 * @property {number} maxSessionSize - 单次学习会话最大词数
 * @property {() => number} [rng] - 随机源，默认 Math.random（测试可注入）
 */

/**
 * 默认配置
 */
export const DEFAULT_CONFIG = {
  newPerDay: 15,
  maxReviewPerDay: 120,
  maxSessionSize: 50
};

/**
 * Fisher-Yates 洗牌（纯函数，返回新数组）
 * @template T
 * @param {T[]} arr
 * @param {() => number} [rng=Math.random]
 * @returns {T[]}
 */
export function shuffle(arr, rng = Math.random) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

/**
 * 构建学习队列：组间保持优先级，组内乱序
 * @param {Card[]} cards - 该词书的所有卡片
 * @param {number} now - 当前时间戳
 * @param {QueueConfig} [config] - 配置
 * @returns {Card[]} 学习队列
 */
export function buildQueue(cards, now, config = DEFAULT_CONFIG) {
  const { newPerDay, maxReviewPerDay, maxSessionSize } = { ...DEFAULT_CONFIG, ...config };
  const rng = config.rng || Math.random;

  const newCards = [];
  const learningCards = [];
  const reviewCards = [];
  const relearningCards = [];

  for (const card of cards) {
    if (card.state === 'new') {
      newCards.push(card);
    } else if (card.state === 'learning') {
      learningCards.push(card);
    } else if (card.state === 'relearning') {
      relearningCards.push(card);
    } else if (card.state === 'review' && card.due <= now) {
      reviewCards.push(card);
    }
  }

  // 新词：全量 shuffle 后随机抽 newPerDay（非固定前 rank）
  const limitedNewCards = shuffle(newCards, rng).slice(0, newPerDay);

  // 复习：按 due 升序（最逾期优先入选）截断后，对入选子集乱序呈现
  reviewCards.sort((a, b) => (a.due || 0) - (b.due || 0));
  const limitedReviewCards = shuffle(reviewCards.slice(0, maxReviewPerDay), rng);

  // 重学 / 学习：组内乱序
  const shuffledRelearning = shuffle(relearningCards, rng);
  const shuffledLearning = shuffle(learningCards, rng);

  const queue = [
    ...limitedReviewCards,
    ...shuffledRelearning,
    ...shuffledLearning,
    ...limitedNewCards
  ];

  return queue.slice(0, maxSessionSize);
}

/**
 * 计算今日统计
 * @param {Card[]} cards - 该词书的所有卡片
 * @param {number} now - 当前时间戳
 * @returns {Object} 统计信息
 */
export function getTodayStats(cards, now) {
  const newCards = cards.filter(c => c.state === 'new');
  const learningCards = cards.filter(c => c.state === 'learning' || c.state === 'relearning');
  const reviewCards = cards.filter(c => c.state === 'review' && c.due <= now);
  const masteredCards = cards.filter(c => c.state === 'review' && c.due > now);

  return {
    total: cards.length,
    new: newCards.length,
    learning: learningCards.length,
    review: reviewCards.length,
    mastered: masteredCards.length,
    dueToday: learningCards.length + reviewCards.length
  };
}

/**
 * 混排策略：flash 打底，每 4 张插入 1 个产出型模式
 * @param {Card[]} queue - 学习队列
 * @param {Function} getWord - 获取词条的函数
 * @returns {Object[]} 混排后的队列，每项包含 { card, word, mode }
 */
export function interleaveModes(queue, getWord) {
  const result = [];
  const outputModes = ['choice-en2cn', 'spelling', 'cloze'];

  for (let i = 0; i < queue.length; i++) {
    const card = queue[i];
    const word = getWord(card.wordId);

    const mode = i % 5 === 4
      ? outputModes[Math.floor(Math.random() * outputModes.length)]
      : 'flash';

    result.push({ card, word, mode });
  }

  return result;
}

/**
 * 检查是否需要顺延（超出限流的部分）
 * @param {Card[]} cards - 该词书的所有卡片
 * @param {number} now - 当前时间戳
 * @param {QueueConfig} [config] - 配置
 * @returns {Object} 顺延信息
 */
export function getOverflowInfo(cards, now, config = DEFAULT_CONFIG) {
  const newCards = cards.filter(c => c.state === 'new');
  const reviewCards = cards.filter(c => c.state === 'review' && c.due <= now);

  const overflowNew = Math.max(0, newCards.length - config.newPerDay);
  const overflowReview = Math.max(0, reviewCards.length - config.maxReviewPerDay);

  return {
    overflowNew,
    overflowReview,
    totalOverflow: overflowNew + overflowReview,
    hasOverflow: overflowNew > 0 || overflowReview > 0
  };
}

/**
 * 模拟多天学习（用于测试）
 * @param {Card[]} cards - 初始卡片
 * @param {number} days - 模拟天数
 * @param {Function} gradeFn - 评分函数
 * @returns {Object[]} 每天的统计
 */
export function simulateDays(cards, days, gradeFn) {
  const stats = [];
  let currentCards = [...cards];

  for (let day = 0; day < days; day++) {
    const now = Date.now() + day * 24 * 60 * 60 * 1000;
    const queue = buildQueue(currentCards, now);
    const todayStats = getTodayStats(currentCards, now);

    for (const card of queue) {
      const rating = Math.floor(Math.random() * 4) + 1;
      const updatedCard = gradeFn(card, rating, now);
      const index = currentCards.findIndex(c => c.id === card.id);
      if (index !== -1) {
        currentCards[index] = updatedCard;
      }
    }

    stats.push({
      day,
      queueSize: queue.length,
      ...todayStats
    });
  }

  return stats;
}
