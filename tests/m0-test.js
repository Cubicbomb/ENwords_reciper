/**
 * M0 闭环测试：导入样例数据 → 翻卡背诵 → 学习记录写入 IndexedDB
 * 使用 node --test 运行
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { openDB, getAll, get, put, add, clear } from '../src/store/db.js';
import { createWord, createDeck, createCard, normalizeWord } from '../src/domain/model.js';
import { grade } from '../src/domain/scheduler.js';

describe('M0 闭环测试', () => {
  let db;
  
  before(async () => {
    // 打开数据库
    db = await openDB();
    console.log('数据库已打开');
  });
  
  after(async () => {
    // 清理测试数据
    await clear(db, 'words');
    await clear(db, 'decks');
    await clear(db, 'cards');
    await clear(db, 'logs');
    await clear(db, 'flags');
    console.log('测试数据已清理');
  });
  
  it('应该正确创建词条', async () => {
    const word = createWord({
      lemma: 'abandon',
      senses: [{ pos: 'v.', defCn: '放弃，遗弃' }],
      examples: [{ en: 'They had to abandon the project.', cn: '他们不得不放弃这个项目。' }],
      tags: ['cet4', 'core'],
      rank: 1
    });
    
    assert.strictEqual(word.id, 'abandon');
    assert.strictEqual(word.lemma, 'abandon');
    assert.strictEqual(word.senses.length, 1);
    assert.strictEqual(word.senses[0].defCn, '放弃，遗弃');
    
    await put(db, 'words', word);
    const savedWord = await get(db, 'words', 'abandon');
    assert.deepStrictEqual(savedWord, word);
    
    console.log('✅ 词条创建测试通过');
  });
  
  it('应该正确创建词书', async () => {
    const deck = createDeck({
      name: 'CET4 核心词汇',
      source: 'builtin',
      wordIds: ['abandon', 'ability']
    });
    
    assert.strictEqual(deck.id.startsWith('deck-'), true);
    assert.strictEqual(deck.name, 'CET4 核心词汇');
    assert.strictEqual(deck.source, 'builtin');
    assert.strictEqual(deck.wordIds.length, 2);
    
    await put(db, 'decks', deck);
    const savedDeck = await get(db, 'decks', deck.id);
    assert.deepStrictEqual(savedDeck, deck);
    
    console.log('✅ 词书创建测试通过');
  });
  
  it('应该正确创建卡片', async () => {
    const card = createCard('test-deck', 'abandon');
    
    assert.strictEqual(card.id, 'test-deck:abandon');
    assert.strictEqual(card.state, 'new');
    assert.strictEqual(card.ease, 2.5);
    assert.strictEqual(card.reps, 0);
    
    await put(db, 'cards', card);
    const savedCard = await get(db, 'cards', card.id);
    assert.deepStrictEqual(savedCard, card);
    
    console.log('✅ 卡片创建测试通过');
  });
  
  it('应该正确应用 SM-2 调度', async () => {
    const card = {
      id: 'test-card',
      deckId: 'test-deck',
      wordId: 'test-word',
      state: 'new',
      due: 0,
      intervalDays: 0,
      ease: 2.5,
      reps: 0,
      lapses: 0,
      streak: 0
    };
    
    const now = Date.now();
    
    // 测试 rating=3（认识）
    const updatedCard = grade(card, 3, now);
    
    assert.strictEqual(updatedCard.state, 'review');
    assert.strictEqual(updatedCard.intervalDays, 1); // 第一次间隔 1 天
    assert.strictEqual(updatedCard.reps, 1);
    assert.strictEqual(updatedCard.streak, 1);
    assert.ok(updatedCard.due > now);
    
    console.log('✅ SM-2 调度测试通过');
  });
  
  it('应该正确归一化词条', async () => {
    // 测试 CSV 风格的数据
    const raw1 = { word: 'hello', def: '你好', phonetic: '/həˈləʊ/' };
    const normalized1 = normalizeWord(raw1);
    
    assert.strictEqual(normalized1.id, 'hello');
    assert.strictEqual(normalized1.lemma, 'hello');
    assert.strictEqual(normalized1.senses.length, 1);
    assert.strictEqual(normalized1.senses[0].defCn, '你好');
    assert.strictEqual(normalized1.phonetic.uk, '/həˈləʊ/');
    
    // 测试中文字段名
    const raw2 = { 单词: '世界', 释义: 'world', 例句: 'Hello world' };
    const normalized2 = normalizeWord(raw2);
    
    assert.strictEqual(normalized2.id, '世界');
    assert.strictEqual(normalized2.lemma, '世界');
    assert.strictEqual(normalized2.senses.length, 1);
    assert.strictEqual(normalized2.senses[0].defCn, 'world');
    assert.strictEqual(normalized2.examples.length, 1);
    assert.strictEqual(normalized2.examples[0].en, 'Hello world');
    
    console.log('✅ 归一化测试通过');
  });
  
  it('应该正确处理批量导入', async () => {
    const wordsData = [
      { word: 'test1', def: '测试1' },
      { word: 'test2', def: '测试2' },
      { word: 'test3', def: '测试3' }
    ];
    
    const words = wordsData.map(normalizeWord).filter(w => w && w.id);
    assert.strictEqual(words.length, 3);
    
    // 批量写入
    for (const word of words) {
      await put(db, 'words', word);
    }
    
    // 验证
    const allWords = await getAll(db, 'words');
    assert.ok(allWords.length >= 3);
    
    console.log('✅ 批量导入测试通过');
  });
});