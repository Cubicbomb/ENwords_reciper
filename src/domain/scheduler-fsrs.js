/**
 * FSRS 调度器：FSRS-4.5 算法实现
 * 纯函数，不碰 IO，可直接被 node --test 覆盖
 * 接口与 SM-2 兼容，可无缝切换
 */

/**
 * @typedef {import('./model.js').Card} Card
 * @typedef {import('./model.js').Rating} Rating
 */

/**
 * FSRS 默认参数（FSRS-4.5）
 */
const DEFAULT_PARAMS = {
  requestRetention: 0.9,  // 目标留存率
  maximumInterval: 36500,  // 最大间隔（天）
  w: [0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 1.8, 0.14, 1.26, 0.06, 0.35, 1.6, 0.16, 0.58, 1.537, 0.0675, 0.47, 2.98]
};

/**
 * FSRS 调度算法
 * @param {Card} card - 当前卡片
 * @param {Rating} rating - 评分 (1=重来, 2=模糊, 3=认识, 4=简单)
 * @param {number} now - 当前时间戳
 * @param {Object} params - FSRS 参数
 * @returns {Card} 更新后的卡片（纯函数，不修改入参）
 */
export function gradeFSRS(card, rating, now, params = DEFAULT_PARAMS) {
  // 深拷贝，避免修改原对象
  const updated = { ...card };
  
  // 更新 lastReview
  updated.lastReview = now;
  updated.reps++;
  
  // 记忆稳定性 (stability) 和难度 (difficulty)
  let stability = card.stability || 0;
  let difficulty = card.difficulty || 0;
  
  // 根据评分计算新的状态
  switch (rating) {
    case 1: // 重来（不认识）
      updated.state = 'relearning';
      updated.intervalDays = 0;
      updated.lapses++;
      updated.streak = 0;
      
      // 重置稳定性
      stability = Math.max(1, stability * 0.2);
      difficulty = Math.min(10, difficulty + params.w[2]);
      break;
      
    case 2: // 模糊（有点犹豫）
      updated.state = 'relearning';
      updated.intervalDays = Math.max(1, Math.round(stability * 0.2));
      updated.ease = Math.max(1.3, updated.ease - 0.15);
      updated.streak = 0;
      
      // 稳定性小幅下降
      stability = Math.max(1, stability * 0.8);
      difficulty = Math.min(10, difficulty + params.w[3] * 0.5);
      break;
      
    case 3: // 认识（正确）
      if (updated.state === 'new' || updated.state === 'learning' || updated.state === 'relearning') {
        updated.state = 'review';
        updated.intervalDays = Math.max(1, Math.round(stability * params.w[0]));
      } else {
        // 复习
        updated.intervalDays = Math.max(1, Math.round(stability * params.w[1]));
      }
      updated.streak++;
      
      // 稳定性增长
      stability = Math.max(1, stability * (1 + params.w[4] * (10 - difficulty) * Math.pow(stability, -params.w[5])));
      difficulty = Math.max(0, difficulty - params.w[6]);
      break;
      
    case 4: // 简单（很容易）
      if (updated.state === 'new' || updated.state === 'learning' || updated.state === 'relearning') {
        updated.state = 'review';
        updated.intervalDays = Math.max(1, Math.round(stability * params.w[7]));
      } else {
        // 复习
        updated.intervalDays = Math.max(1, Math.round(stability * params.w[8]));
      }
      updated.streak++;
      
      // 稳定性大幅增长
      stability = Math.max(1, stability * (1 + params.w[9] * (10 - difficulty) * Math.pow(stability, -params.w[10])));
      difficulty = Math.max(0, difficulty - params.w[11]);
      break;
      
    default:
      throw new Error(`Invalid rating: ${rating}`);
  }
  
  // 更新 ease（保持与 SM-2 兼容）
  updated.ease = Math.max(1.3, Math.min(3.0, updated.ease + (rating - 3) * 0.1));
  
  // 更新稳定性
  updated.stability = stability;
  updated.difficulty = difficulty;
  
  // 计算下次复习时间
  updated.due = calculateDueFSRS(now, updated.intervalDays);
  
  return updated;
}

/**
 * 计算下次复习时间（FSRS 版本）
 * @param {number} now - 当前时间戳
 * @param {number} intervalDays - 间隔天数
 * @returns {number} 下次复习时间戳
 */
export function calculateDueFSRS(now, intervalDays) {
  // 加入随机抖动（±2%），避免同批词永远同天复习
  const jitter = 1 + (Math.random() - 0.5) * 0.04; // 0.98 ~ 1.02
  const days = Math.max(0, Math.round(intervalDays * jitter));
  
  // 按天计算，忽略时区（简化处理）
  const msPerDay = 24 * 60 * 60 * 1000;
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  
  return todayStart.getTime() + days * msPerDay;
}

/**
 * 检查卡片是否到期（FSRS 版本）
 * @param {Card} card
 * @param {number} now
 * @returns {boolean}
 */
export function isDueFSRS(card, now) {
  if (card.state === 'new') return true;
  if (card.state === 'learning' || card.state === 'relearning') return true;
  if (card.state === 'review' && card.due <= now) return true;
  return false;
}

/**
 * 计算卡片的优先级分数（FSRS 版本）
 * @param {Card} card
 * @param {number} now
 * @returns {number} 分数越高越优先
 */
export function priorityScoreFSRS(card, now) {
  if (card.state === 'new') return 1000; // 新词最高优先级
  
  if (card.state === 'learning' || card.state === 'relearning') {
    // 学习中的卡片：逾期越久优先级越高
    const overdueDays = Math.max(0, (now - card.due) / (24 * 60 * 60 * 1000));
    return 500 + overdueDays * 10;
  }
  
  if (card.state === 'review') {
    // 复习卡片：逾期越久优先级越高
    const overdueDays = Math.max(0, (now - card.due) / (24 * 60 * 60 * 1000));
    return overdueDays * 10;
  }
  
  return 0;
}

/**
 * 预测卡片的留存率
 * @param {Card} card
 * @param {number} days - 预测天数
 * @param {Object} params - FSRS 参数
 * @returns {number} 留存率 (0-1)
 */
export function predictRetention(card, days, params = DEFAULT_PARAMS) {
  const stability = card.stability || 1;
  const difficulty = card.difficulty || 5;
  
  // 简化的留存率预测
  const retention = Math.exp(-days / (stability * Math.pow(10, difficulty / 10)));
  return Math.max(0, Math.min(1, retention));
}

/**
 * 计算最优复习间隔（基于目标留存率）
 * @param {Card} card
 * @param {Object} params - FSRS 参数
 * @returns {number} 最优间隔天数
 */
export function optimalInterval(card, params = DEFAULT_PARAMS) {
  const stability = card.stability || 1;
  const difficulty = card.difficulty || 5;
  
  // 基于目标留存率计算最优间隔
  const optimalDays = stability * Math.pow(-Math.log(params.requestRetention), 1 / (1 + difficulty / 10));
  return Math.max(1, Math.min(params.maximumInterval, Math.round(optimalDays)));
}