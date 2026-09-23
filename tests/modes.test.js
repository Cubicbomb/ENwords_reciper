/**
 * 模式集成测试
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

// 内联模式函数 — 保持与 src/modes/index.js 同步
function canUseMode(modeId, word) {
  const modeRequirements = {
    'flash': [],
    'choice-en2cn': ['senses'],
    'choice-cn2en': ['senses'],
    'spelling': ['lemma'],
    'cloze': ['examples'],
    'listen': []
  };
  
  const requires = modeRequirements[modeId];
  if (!requires) return false;
  
  return requires.every(req => {
    if (req === 'senses')    return word.senses?.length > 0;
    if (req === 'examples')  return word.examples?.length > 0;
    if (req === 'lemma')     return word.lemma?.trim().length > 0;
    return !!word[req];
  });
}

function autoSelectMode(word, index) {
  const output = ['choice-en2cn', 'spelling', 'cloze'].filter(id => canUseMode(id, word));
  if (index % 5 === 4 && output.length > 0) {
    return output[Math.floor(Math.random() * output.length)];
  }
  return 'flash';
}

describe('canUseMode()', () => {
  it('flash 模式总是可用', () => {
    const word = { senses: [], examples: [], lemma: '' };
    assert.ok(canUseMode('flash', word));
  });
  
  it('choice 模式需要 senses', () => {
    const wordWithSenses = { senses: [{ pos: 'n', defCn: '测试' }] };
    const wordWithoutSenses = { senses: [] };
    
    assert.ok(canUseMode('choice-en2cn', wordWithSenses));
    assert.ok(!canUseMode('choice-en2cn', wordWithoutSenses));
  });
  
  it('spelling 模式需要 lemma', () => {
    const wordWithLemma = { lemma: 'test' };
    const wordWithoutLemma = { lemma: '' };
    
    assert.ok(canUseMode('spelling', wordWithLemma));
    assert.ok(!canUseMode('spelling', wordWithoutLemma));
  });
  
  it('cloze 模式需要 examples', () => {
    const wordWithExamples = { examples: [{ en: 'test sentence' }] };
    const wordWithoutExamples = { examples: [] };
    
    assert.ok(canUseMode('cloze', wordWithExamples));
    assert.ok(!canUseMode('cloze', wordWithoutExamples));
  });
  
  it('listen 模式总是可用', () => {
    const word = { senses: [], examples: [], lemma: '' };
    assert.ok(canUseMode('listen', word));
  });
});

describe('autoSelectMode()', () => {
  it('前 4 张使用 flash', () => {
    const word = { senses: [{ pos: 'n', defCn: '测试' }], examples: [{ en: 'test' }], lemma: 'test' };
    
    for (let i = 0; i < 4; i++) {
      assert.equal(autoSelectMode(word, i), 'flash');
    }
  });
  
  it('第 5 张使用产出型模式', () => {
    const word = { senses: [{ pos: 'n', defCn: '测试' }], examples: [{ en: 'test' }], lemma: 'test' };
    const mode = autoSelectMode(word, 4);
    assert.ok(['choice-en2cn', 'spelling', 'cloze'].includes(mode));
  });
  
  it('第 6-9 张使用 flash', () => {
    const word = { senses: [{ pos: 'n', defCn: '测试' }], examples: [{ en: 'test' }], lemma: 'test' };
    
    for (let i = 5; i < 9; i++) {
      assert.equal(autoSelectMode(word, i), 'flash');
    }
  });
  
  it('第 10 张使用产出型模式', () => {
    const word = { senses: [{ pos: 'n', defCn: '测试' }], examples: [{ en: 'test' }], lemma: 'test' };
    const mode = autoSelectMode(word, 9);
    assert.ok(['choice-en2cn', 'spelling', 'cloze'].includes(mode));
  });
  
  it('缺数据时降级为 flash', () => {
    // 创建一个缺少 senses 和 examples 的 word
    const word = { senses: [], examples: [], lemma: '' };
    const mode = autoSelectMode(word, 4);
    assert.equal(mode, 'flash');
  });
});