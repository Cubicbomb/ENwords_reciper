/**
 * computeMistakeEntries 测试（纯函数）
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { computeMistakeEntries } from '../src/domain/mistakes.js';

function word(id) {
  return { id, lemma: id, senses: [{ pos: '', defCn: 'x' }], tags: [] };
}

function log(wordId, rating, ts) {
  return { id: ts, ts, cardId: `d:${wordId}`, wordId, deckId: 'd', mode: 'flash', rating, correct: rating >= 3, ms: 10 };
}

describe('computeMistakeEntries()', () => {
  it('空输入返回空数组', () => {
    assert.deepEqual(computeMistakeEntries({ words: [], logs: [], flags: [] }), []);
  });

  it('最近一次 rating=3 → 不在（即使历史错过）', () => {
    const entries = computeMistakeEntries({
      words: [word('alpha'), word('beta')],
      logs: [log('alpha', 1, 100), log('alpha', 3, 200), log('beta', 4, 150)],
      flags: []
    });
    assert.equal(entries.length, 0);
  });

  it('最近一次 rating<=2 → 在；wrongCount 统计全部 rating<=2', () => {
    const entries = computeMistakeEntries({
      words: [word('alpha')],
      logs: [log('alpha', 1, 100), log('alpha', 3, 200), log('alpha', 2, 300)],
      flags: []
    });
    assert.equal(entries.length, 1);
    assert.equal(entries[0].manual, false);
    assert.equal(entries[0].wrongCount, 2);
    assert.equal(entries[0].lastWrongAt, 300);
  });

  it('手动摘录无日志也进入，manual=true', () => {
    const entries = computeMistakeEntries({
      words: [word('gamma')],
      logs: [],
      flags: [{ wordId: 'gamma', type: 'mistake', updatedAt: 500 }]
    });
    assert.equal(entries.length, 1);
    assert.equal(entries[0].manual, true);
    assert.equal(entries[0].wrongCount, 0);
    assert.equal(entries[0].lastWrongAt, 500);
  });

  it('ignore 抑制日志派生', () => {
    const entries = computeMistakeEntries({
      words: [word('alpha')],
      logs: [log('alpha', 1, 100)],
      flags: [{ wordId: 'alpha', type: 'ignore', updatedAt: 200 }]
    });
    assert.equal(entries.length, 0);
  });

  it('同时有 mistake 与 ignore → 仍显示（手动优先）', () => {
    const entries = computeMistakeEntries({
      words: [word('alpha')],
      logs: [],
      flags: [
        { wordId: 'alpha', type: 'mistake', updatedAt: 300 },
        { wordId: 'alpha', type: 'ignore', updatedAt: 200 }
      ]
    });
    assert.equal(entries.length, 1);
    assert.equal(entries[0].manual, true);
  });

  it('词条不在 words 中则跳过', () => {
    const entries = computeMistakeEntries({
      words: [],
      logs: [log('ghost', 1, 100)],
      flags: [{ wordId: 'ghost2', type: 'mistake', updatedAt: 1 }]
    });
    assert.equal(entries.length, 0);
  });

  it('按 lastWrongAt 降序', () => {
    const entries = computeMistakeEntries({
      words: [word('a'), word('b')],
      logs: [],
      flags: [
        { wordId: 'a', type: 'mistake', updatedAt: 100 },
        { wordId: 'b', type: 'mistake', updatedAt: 900 }
      ]
    });
    assert.equal(entries[0].word.id, 'b');
    assert.equal(entries[1].word.id, 'a');
  });

  it('不修改入参', () => {
    const input = {
      words: [word('a')],
      logs: [log('a', 1, 10)],
      flags: [{ wordId: 'a', type: 'mistake', updatedAt: 1 }]
    };
    const snap = JSON.stringify(input);
    computeMistakeEntries(input);
    assert.equal(JSON.stringify(input), snap);
  });
});
