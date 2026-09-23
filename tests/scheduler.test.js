/**
 * SM-2 调度算法测试（纯函数，零外部依赖）
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

// 内联 grade / calculateDue / isDue — 保持与 src/domain/scheduler.js 同步
function grade(card, rating, now) {
  const u = { ...card };
  u.lastReview = now;
  u.reps++;
  switch (rating) {
    case 1: u.state = 'relearning'; u.intervalDays = 0; u.ease = Math.max(1.3, u.ease - 0.2); u.lapses++; u.streak = 0; break;
    case 2: u.state = 'relearning'; u.intervalDays = Math.max(1, Math.round(u.intervalDays * 1.2)); u.ease = Math.max(1.3, u.ease - 0.15); u.streak = 0; break;
    case 3:
      if (['new', 'learning', 'relearning'].includes(u.state)) { u.state = 'review'; u.intervalDays = u.reps === 1 ? 1 : Math.max(1, Math.round(u.intervalDays * u.ease)); }
      else { u.intervalDays = Math.max(1, Math.round(u.intervalDays * u.ease)); }
      u.streak++; break;
    case 4:
      if (['new', 'learning', 'relearning'].includes(u.state)) { u.state = 'review'; u.intervalDays = 3; }
      else { u.intervalDays = Math.max(1, Math.round(u.intervalDays * u.ease * 1.3)); }
      u.ease = Math.min(3.0, u.ease + 0.15); u.streak++; break;
    default: throw new Error(`Invalid rating: ${rating}`);
  }
  const jitter = 1 + (Math.random() - 0.5) * 0.1;
  const days = Math.max(0, Math.round(u.intervalDays * jitter));
  const msPerDay = 86400000;
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  u.due = todayStart.getTime() + days * msPerDay;
  return u;
}

function isDue(card, now) {
  return card.state === 'new' || card.state === 'learning' || card.state === 'relearning' || (card.state === 'review' && card.due <= now);
}

const newCard = () => ({ id: 'd:w', deckId: 'd', wordId: 'w', state: 'new', due: 0, intervalDays: 0, ease: 2.5, reps: 0, lapses: 0, streak: 0 });
const now = Date.now();

describe('SM-2 grade()', () => {
  it('rating=3 首次: state→review, interval=1', () => {
    const c = grade(newCard(), 3, now);
    assert.equal(c.state, 'review');
    assert.equal(c.intervalDays, 1);
    assert.equal(c.reps, 1);
    assert.equal(c.streak, 1);
  });

  it('rating=1: state→relearning, ease 降低, lapses+1', () => {
    const c = grade(newCard(), 1, now);
    assert.equal(c.state, 'relearning');
    assert.equal(c.intervalDays, 0);
    assert.equal(c.ease, 2.3);
    assert.equal(c.lapses, 1);
    assert.equal(c.streak, 0);
  });

  it('rating=4 首次: interval=3, ease 上升', () => {
    const c = grade(newCard(), 4, now);
    assert.equal(c.state, 'review');
    assert.equal(c.intervalDays, 3);
    assert.equal(c.ease, 2.65);
  });

  it('ease 下限为 1.3', () => {
    let c = { ...newCard(), ease: 1.31, state: 'review', intervalDays: 1, reps: 2 };
    c = grade(c, 1, now);
    assert.equal(c.ease, 1.3);
  });

  it('ease 上限为 3.0', () => {
    let c = { ...newCard(), ease: 2.99, state: 'review', intervalDays: 10, reps: 5 };
    c = grade(c, 4, now);
    assert.equal(c.ease, 3.0);
  });

  it('纯函数：不修改原始对象', () => {
    const orig = newCard();
    const copy = { ...orig };
    grade(orig, 3, now);
    assert.deepEqual(orig, copy);
  });
});

describe('isDue()', () => {
  it('新词始终到期', () => assert.ok(isDue(newCard(), now)));
  it('review 未到期 → false', () => assert.ok(!isDue({ ...newCard(), state: 'review', due: now + 86400000 }, now)));
  it('review 已到期 → true', () => assert.ok(isDue({ ...newCard(), state: 'review', due: now - 1 }, now)));
});
