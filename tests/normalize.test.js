/**
 * normalizeWord / wordId 测试（纯函数，零外部依赖）
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

function wordId(lemma) {
  return lemma.trim().toLowerCase().replace(/^to\s+/, '').replace(/\s+/g, ' ');
}

function createWord(partial) {
  const lemma = partial.lemma?.trim() || '';
  return { id: wordId(lemma), lemma, phonetic: partial.phonetic || {}, senses: partial.senses || [], examples: partial.examples || [], tags: partial.tags || [], rank: partial.rank, audio: partial.audio };
}

function normalizeWord(raw) {
  if (!raw || (!raw.word && !raw.lemma && !raw.term && !raw.单词)) return null;
  const lemma = raw.word || raw.lemma || raw.term || raw.单词 || '';
  let senses = [];
  if (raw.def || raw.defCn || raw.释义 || raw.meaning) {
    senses.push({ pos: raw.pos || raw.词性 || '', defCn: raw.def || raw.defCn || raw.释义 || raw.meaning || '', defEn: raw.defEn });
  } else if (Array.isArray(raw.senses)) {
    senses = raw.senses.map(s => ({ pos: s.pos || '', defCn: s.defCn || s.cn || s.def || '', defEn: s.defEn || s.en }));
  }
  let examples = [];
  if (raw.example || raw.exampleEn || raw.例句) {
    examples.push({ en: raw.example || raw.exampleEn || raw.例句 || '', cn: raw.exampleCn || raw.例句译 || '' });
  } else if (Array.isArray(raw.examples)) {
    examples = raw.examples.map(e => ({ en: e.en || e.example || '', cn: e.cn || e.exampleCn }));
  }
  let phonetic = {};
  if (raw.phonetic) phonetic = typeof raw.phonetic === 'string' ? { uk: raw.phonetic } : raw.phonetic;
  else if (raw.音标) phonetic = { uk: raw.音标 };
  return createWord({ lemma, senses, examples, phonetic, tags: raw.tags || [], rank: raw.rank });
}

describe('wordId()', () => {
  it('基本转换', () => assert.equal(wordId('  Hello  '), 'hello'));
  it('去掉 to 前缀', () => assert.equal(wordId('to do'), 'do'));
  it('多余空格合并', () => assert.equal(wordId('a  b  c'), 'a b c'));
});

describe('normalizeWord()', () => {
  it('null / 空对象 → null', () => { assert.equal(normalizeWord(null), null); assert.equal(normalizeWord({}), null); });

  it('cet4.json 格式（已有 senses 数组）', () => {
    const r = normalizeWord({ lemma: 'abandon', senses: [{ pos: 'v', defCn: '放弃' }], examples: [], rank: 1, tags: ['cet4'] });
    assert.equal(r.id, 'abandon');
    assert.equal(r.senses[0].defCn, '放弃');
    assert.deepEqual(r.tags, ['cet4']);
  });

  it('CSV 格式（def 字段）', () => {
    const r = normalizeWord({ word: 'hello', def: '你好', phonetic: '/həˈləʊ/' });
    assert.equal(r.id, 'hello');
    assert.equal(r.senses[0].defCn, '你好');
    assert.equal(r.phonetic.uk, '/həˈləʊ/');
  });

  it('中文字段名', () => {
    const r = normalizeWord({ 单词: '世界', 释义: 'world', 例句: 'Hello world' });
    assert.equal(r.id, '世界');
    assert.equal(r.senses[0].defCn, 'world');
    assert.equal(r.examples[0].en, 'Hello world');
  });
});
