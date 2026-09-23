/**
 * 队列系统测试 — 导入 src/domain/queue.js 真源
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { buildQueue, shuffle, getTodayStats, getOverflowInfo, DEFAULT_CONFIG } from '../src/domain/queue.js';

/** 固定序列 rng：按数组循环返回 */
function seqRng(values) {
  let i = 0;
  return () => values[i++ % values.length];
}

describe('shuffle()', () => {
  it('返回新数组且成员集合不变', () => {
    const arr = [1, 2, 3, 4, 5];
    const out = shuffle(arr, seqRng([0.9, 0.1, 0.5, 0.2, 0.7]));
    assert.notEqual(out, arr);
    assert.deepEqual([...arr].sort((a, b) => a - b), [...out].sort((a, b) => a - b));
    assert.deepEqual(arr, [1, 2, 3, 4, 5]);
  });

  it('空数组与单元素', () => {
    assert.deepEqual(shuffle([], Math.random), []);
    assert.deepEqual(shuffle([7], Math.random), [7]);
  });
});

describe('buildQueue()', () => {
  it('空卡片列表', () => {
    assert.equal(buildQueue([], Date.now()).length, 0);
  });

  it('新词限流仍为 15', () => {
    const cards = Array.from({ length: 20 }, (_, i) => ({
      id: `card${i}`, state: 'new', rank: i
    }));
    assert.equal(buildQueue(cards, Date.now()).length, DEFAULT_CONFIG.newPerDay);
  });

  it('复习限流', () => {
    const now = Date.now();
    const cards = Array.from({ length: 150 }, (_, i) => ({
      id: `card${i}`, state: 'review', due: now - 1000, rank: i
    }));
    const queue = buildQueue(cards, now, { maxReviewPerDay: 100, maxSessionSize: 200 });
    assert.equal(queue.length, 100);
  });

  it('优先级：复习 > 重新学习 > 新词（组间顺序保持）', () => {
    const now = Date.now();
    const cards = [
      { id: 'new1', state: 'new', rank: 1 },
      { id: 'review1', state: 'review', due: now - 1000, rank: 1 },
      { id: 'relearning1', state: 'relearning', due: now - 1000, rank: 1 }
    ];
    const queue = buildQueue(cards, now, { rng: () => 0.5 });
    const ids = queue.map(c => c.id);
    assert.deepEqual(ids, ['review1', 'relearning1', 'new1']);
  });

  it('会话大小限制', () => {
    const cards = Array.from({ length: 100 }, (_, i) => ({
      id: `card${i}`, state: 'new', rank: i
    }));
    // 提高新词日限，确保瓶颈是 maxSessionSize 而非 newPerDay
    const queue = buildQueue(cards, Date.now(), { maxSessionSize: 30, newPerDay: 100 });
    assert.equal(queue.length, 30);
  });

  it('新词组内随机抽样：固定 rng 成员集合不变但顺序打乱', () => {
    const cards = Array.from({ length: 15 }, (_, i) => ({
      id: `n${i}`, state: 'new', rank: i
    }));
    const queue = buildQueue(cards, Date.now(), { rng: () => 0 });
    assert.equal(queue.length, 15);
    assert.deepEqual(
      [...queue].map(c => c.id).sort(),
      cards.map(c => c.id).sort()
    );
    // rng()=0 → j 始终为当前 i → 实际是逆序交换路径，不应保持原 rank 序
    const order = queue.map(c => c.rank);
    assert.notDeepEqual(order, cards.map(c => c.rank));
  });

  it('复习入选仍按最逾期优先（due 升序截断后再乱序呈现）', () => {
    const now = Date.now();
    const cards = [
      { id: 'r_new', state: 'review', due: now - 1000 },
      { id: 'r_old', state: 'review', due: now - 90000 },
      { id: 'r_mid', state: 'review', due: now - 50000 }
    ];
    const queue = buildQueue(cards, now, {
      maxReviewPerDay: 2,
      maxSessionSize: 10,
      rng: () => 0
    });
    const ids = queue.map(c => c.id).sort();
    assert.deepEqual(ids, ['r_mid', 'r_old']);
  });

  it('默认 rng：成员集合与确定性版本一致，复习组仍在最前', () => {
    const now = Date.now();
    const cards = [
      { id: 'n1', state: 'new', rank: 1 },
      { id: 'n2', state: 'new', rank: 2 },
      { id: 'v1', state: 'review', due: now - 10 },
      { id: 'l1', state: 'learning', due: now }
    ];
    const queue = buildQueue(cards, now);
    assert.deepEqual(queue.map(c => c.id).sort(), ['l1', 'n1', 'n2', 'v1']);
    assert.equal(queue[0].id, 'v1');
  });

  it('config 缺省字段时与 DEFAULT_CONFIG 合并', () => {
    const cards = Array.from({ length: 20 }, (_, i) => ({
      id: `c${i}`, state: 'new', rank: i
    }));
    // 只传 rng，不传 newPerDay → 应仍用默认 15
    const queue = buildQueue(cards, Date.now(), { rng: () => 0.123 });
    assert.equal(queue.length, 15);
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
      { id: 'review1', state: 'review', due: now - 1000 },
      { id: 'review2', state: 'review', due: now + 1000 }
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
      id: `card${i}`, state: 'new'
    }));
    const info = getOverflowInfo(cards, Date.now());
    assert.equal(info.hasOverflow, false);
    assert.equal(info.totalOverflow, 0);
  });

  it('新词溢出', () => {
    const cards = Array.from({ length: 20 }, (_, i) => ({
      id: `card${i}`, state: 'new'
    }));
    const info = getOverflowInfo(cards, Date.now());
    assert.equal(info.hasOverflow, true);
    assert.equal(info.overflowNew, 5);
    assert.equal(info.overflowReview, 0);
  });

  it('复习溢出', () => {
    const now = Date.now();
    const cards = Array.from({ length: 150 }, (_, i) => ({
      id: `card${i}`, state: 'review', due: now - 1000
    }));
    const info = getOverflowInfo(cards, now);
    assert.equal(info.hasOverflow, true);
    assert.equal(info.overflowNew, 0);
    assert.equal(info.overflowReview, 30);
  });
});
