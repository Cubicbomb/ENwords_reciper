/**
 * 模式注册表 + 能力降级调度
 */

import flash from './flash.js';
import choice from './choice.js';
import spelling from './spelling.js';
import cloze from './cloze.js';
import listen from './listen.js';

/** @type {Map<string, {build: Function, id: string, name: string, requires: string[]}>} */
const modes = new Map();

modes.set('flash',          { ...flash,          id: 'flash',          name: '卡片翻转', requires: [] });
modes.set('choice-en2cn',   { ...choice,         id: 'choice-en2cn',   name: '选择释义', requires: ['senses'] });
modes.set('choice-cn2en',   { ...choice,         id: 'choice-cn2en',   name: '选择单词', requires: ['senses'] });
modes.set('spelling',       { ...spelling,       id: 'spelling',       name: '拼写',     requires: ['lemma'] });
modes.set('cloze',          { ...cloze,          id: 'cloze',          name: '例句填空', requires: ['examples'] });
modes.set('listen',         { ...listen,         id: 'listen',         name: '听音选词', requires: [] });

export function canUseMode(modeId, word) {
  const mode = modes.get(modeId);
  if (!mode) return false;
  return mode.requires.every(req => {
    if (req === 'senses')    return word.senses?.length > 0;
    if (req === 'examples')  return word.examples?.length > 0;
    if (req === 'lemma')     return word.lemma?.trim().length > 0;
    return !!word[req];
  });
}

/**
 * 自动选择模式：flash 打底，每 4 张插一个产出型
 */
export function autoSelectMode(word, index) {
  const output = ['choice-en2cn', 'spelling', 'cloze'].filter(id => canUseMode(id, word));
  if (index % 5 === 4 && output.length > 0) {
    return modes.get(output[Math.floor(Math.random() * output.length)]);
  }
  return modes.get('flash');
}

export default modes;
