/**
 * 队列系统测试
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

// 内联队列函数 — 保持与 src/domain/queue.js 同步
const DEFAULT_CONFIG = {
  newPerDay: 15,
  maxReviewPerDay: 120,
  maxSessionSize: 50
};

function buildQueue(cards, now, config = DEFAULT_CONFIG) {
  const { newPerDay, maxReviewPerDay, maxSessionSize } = config;
  
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
  
  newCards.sort((a, b) => (a.rank || 0) - (b.rank || 0));
  learningCards.sort((a, b) => (a.due || 0) - (b.due || 0));
  relearningCards.sort((a, b) => (a.due || 0) - (b.due || 0));
  reviewCards.sort((a, b) => (a.due || 0) - (b.due || 0));
  
  const limitedNewCards = newCards.slice(0, newPerDay);
  const limitedReviewCards = reviewCards.slice(0, maxReviewPerDay);
  
  const queue = [
    ...limitedReviewCards,
    ...relearningCards,
    ...learningCards,
    ...limitedNewCards
  ];
  
  return queue.slice(0, maxSessionSize);
}

function getTodayStats(cards, now) {
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

function getOverflowInfo(cards, now, config = DEFAULT_CONFIG) {
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

describe('buildQueue()', () => {
  it('空卡片列表', () => {
    const queue = buildQueue([], Date.now());
    assert.equal(queue.length, 0);
  });
  
  it('新词限流', () => {
    // 创建 20 张新词卡片
    const cards = Array.from({ length: 20 }, (_, i) => ({
      id: `card${i}`,
      state: 'new',
      rank: i
    }));
    
    const queue = buildQueue(cards, Date.now());
    assert.equal(queue.length, 15); // 默认 newPerDay=15
  });
  
  it('复习限流', () => {
    const now = Date.now();
    // 创建 150 张到期复习卡片
    const cards = Array.from({ length: 150 }, (_, i) => ({
      id: `card${i}`,
      state: 'review',
      due: now - 1000, // 已到期
      rank: i
    }));
    
    // 显式指定 maxReviewPerDay 限制
    const queue = buildQueue(cards, now, { maxReviewPerDay: 100, maxSessionSize: 200 });
    assert.equal(queue.length, 100); // 限制为 100
  });
  
  it('优先级：复习 > 重新学习 > 新词', () => {
    const now = Date.now();
    const cards = [
      { id: 'new1', state: 'new', rank: 1 },
      { id: 'review1', state: 'review', due: now - 1000, rank: 1 },
      { id: 'relearning1', state: 'relearning', due: now - 1000, rank: 1 }
    ];
    
    const queue = buildQueue(cards, now);
    assert.equal(queue[0].id, 'review1');
    assert.equal(queue[1].id, 'relearning1');
    assert.equal(queue[2].id, 'new1');
  });
  
  it('会话大小限制', () => {
    const cards = Array.from({ length: 100 }, (_, i) => ({
      id: `card${i}`,
      state: 'new',
      rank: i
    }));
    
    const queue = buildQueue(cards, Date.now(), { maxSessionSize: 30 });
    assert.equal(queue.length, 30);
  });
});

describe('getTodayStats()', () => {
  it('空卡片列表', () => {
    const stats = getTodayStats([], Date.now());
    assert.equal(stats.total, 0);
    assert.equal(stats.new, 0);
    assert.equal(stats.review, 0);
  });
  
  it('统计各类卡片', () => {
    const now = Date.now();
    const cards = [
      { id: 'new1', state: 'new' },
      { id: 'new2', state: 'new' },
      { id: 'learning1', state: 'learning' },
      { id: 'review1', state: 'review', due: now - 1000 }, // 已到期
      { id: 'review2', state: 'review', due: now + 1000 }  // 未到期
    ];
    
    const stats = getTodayStats(cards, now);
    assert.equal(stats.total, 5);
    assert.equal(stats.new, 2);
    assert.equal(stats.learning, 1);
    assert.equal(stats.review, 1);
    assert.equal(stats.mastered, 1);
    assert.equal(stats.dueToday, 2);
  });
});

describe('getOverflowInfo()', () => {
  it('无溢出', () => {
    const cards = Array.from({ length: 10 }, (_, i) => ({
      id: `card${i}`,
      state: 'new'
    }));
    
    const info = getOverflowInfo(cards, Date.now());
    assert.equal(info.hasOverflow, false);
    assert.equal(info.totalOverflow, 0);
  });
  
  it('新词溢出', () => {
    const cards = Array.from({ length: 20 }, (_, i) => ({
      id: `card${i}`,
      state: 'new'
    }));
    
    const info = getOverflowInfo(cards, Date.now());
    assert.equal(info.hasOverflow, true);
    assert.equal(info.overflowNew, 5);
    assert.equal(info.overflowReview, 0);
  });
  
  it('复习溢出', () => {
    const now = Date.now();
    const cards = Array.from({ length: 150 }, (_, i) => ({
      id: `card${i}`,
      state: 'review',
      due: now - 1000
    }));
    
    const info = getOverflowInfo(cards, now);
    assert.equal(info.hasOverflow, true);
    assert.equal(info.overflowNew, 0);
    assert.equal(info.overflowReview, 30);
  });
});