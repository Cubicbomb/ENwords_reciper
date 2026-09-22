/**
 * SRS 调度器：SM-2 算法实现
 * 纯函数，不碰 IO，可直接被 node --test 覆盖
 */

/**
 * @typedef {import('./model.js').Card} Card
 * @typedef {import('./model.js').Rating} Rating
 */

/**
 * SM-2 调度算法
 * @param {Card} card - 当前卡片
 * @param {Rating} rating - 评分 (1=重来, 2=模糊, 3=认识, 4=简单)
 * @param {number} now - 当前时间戳
 * @returns {Card} 更新后的卡片（纯函数，不修改入参）
 */
export function grade(card, rating, now) {
  // 深拷贝，避免修改原对象
  const updated = { ...card };
  
  // 更新 lastReview
  updated.lastReview = now;
  updated.reps++;
  
  // 根据评分计算新的状态
  switch (rating) {
    case 1: // 重来（不认识）
      updated.state = 'relearning';
      updated.intervalDays = 0;
      updated.ease = Math.max(1.3, updated.ease - 0.2);
      updated.lapses++;
      updated.streak = 0;
      break;
      
    case 2: // 模糊（有点犹豫）
      updated.state = 'relearning';
      updated.intervalDays = Math.max(1, Math.round(updated.intervalDays * 1.2));
      updated.ease = Math.max(1.3, updated.ease - 0.15);
      updated.streak = 0;
      break;
      
    case 3: // 认识（正确）
      if (updated.state === 'new' || updated.state === 'learning' || updated.state === 'relearning') {
        // 新词或学习中：第一次间隔 1 天
        updated.state = 'review';
        updated.intervalDays = updated.reps === 1 ? 1 : Math.max(1, Math.round(updated.intervalDays * updated.ease));
      } else {
        // 复习：按 ease 增加间隔
        updated.intervalDays = Math.max(1, Math.round(updated.intervalDays * updated.ease));
      }
      updated.streak++;
      break;
      
    case 4: // 简单（很容易）
      if (updated.state === 'new' || updated.state === 'learning' || updated.state === 'relearning') {
        // 新词：跳级到 3 天
        updated.state = 'review';
        updated.intervalDays = 3;
      } else {
        // 复习：跳级
        updated.intervalDays = Math.max(1, Math.round(updated.intervalDays * updated.ease * 1.3));
      }
      updated.ease = Math.min(3.0, updated.ease + 0.15);
      updated.streak++;
      break;
      
    default:
      throw new Error(`Invalid rating: ${rating}`);
  }
  
  // 计算下次复习时间
  updated.due = calculateDue(now, updated.intervalDays);
  
  return updated;
}

/**
 * 计算下次复习时间
 * @param {number} now - 当前时间戳
 * @param {number} intervalDays - 间隔天数
 * @returns {number} 下次复习时间戳
 */
export function calculateDue(now, intervalDays) {
  // 加入随机抖动（±5%），避免同批词永远同天复习
  const jitter = 1 + (Math.random() - 0.5) * 0.1; // 0.95 ~ 1.05
  const days = Math.max(0, Math.round(intervalDays * jitter));
  
  // 按天计算，忽略时区（简化处理）
  const msPerDay = 24 * 60 * 60 * 1000;
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  
  return todayStart.getTime() + days * msPerDay;
}

/**
 * 检查卡片是否到期
 * @param {Card} card
 * @param {number} now
 * @returns {boolean}
 */
export function isDue(card, now) {
  if (card.state === 'new') return true;
  if (card.state === 'learning' || card.state === 'relearning') return true;
  if (card.state === 'review' && card.due <= now) return true;
  return false;
}

/**
 * 计算卡片的优先级分数（用于队列排序）
 * @param {Card} card
 * @param {number} now
 * @returns {number} 分数越高越优先
 */
export function priorityScore(card, now) {
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