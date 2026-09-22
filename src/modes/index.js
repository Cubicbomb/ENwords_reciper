/**
 * 模式注册表 + 能力降级调度
 */

import flash from './flash.js';
import choice from './choice.js';
import spelling from './spelling.js';
import cloze from './cloze.js';
import listen from './listen.js';

/**
 * @typedef {Object} Mode
 * @property {string} id
 * @property {string} name
 * @property {string[]} requires
 * @property {(word: Object, ctx: Object) => import('./flash.js').ModeItem} build
 */

/** @type {Map<string, Mode>} */
const modes = new Map();

// 注册内置模式
modes.set('flash', { ...flash, id: 'flash', name: '卡片翻转', requires: [] });
modes.set('choice-en2cn', { ...choice, id: 'choice-en2cn', name: '选择释义', requires: ['senses'] });
modes.set('choice-cn2en', { ...choice, id: 'choice-cn2en', name: '选择单词', requires: ['senses'] });
modes.set('spelling', { ...spelling, id: 'spelling', name: '拼写', requires: ['lemma'] });
modes.set('cloze', { ...cloze, id: 'cloze', name: '例句填空', requires: ['examples'] });
modes.set('listen', { ...listen, id: 'listen', name: '听音选词', requires: [] });

/**
 * 检查模式是否可用于该词条
 * @param {string} modeId
 * @param {Object} word
 * @returns {boolean}
 */
export function canUseMode(modeId, word) {
  const mode = modes.get(modeId);
  if (!mode) return false;
  
  return mode.requires.every(req => {
    if (req === 'senses') return word.senses?.length > 0;
    if (req === 'examples') return word.examples?.length > 0;
    if (req === 'lemma') return word.lemma?.trim().length > 0;
    return !!word[req];
  });
}

/**
 * 获取指定模式
 * @param {string} modeId
 * @returns {Mode|null}
 */
export function getMode(modeId) {
  return modes.get(modeId) || null;
}

/**
 * 获取所有可用模式
 * @returns {Mode[]}
 */
export function getAllModes() {
  return Array.from(modes.values());
}

/**
 * 获取适用于某词条的所有模式
 * @param {Object} word
 * @returns {Mode[]}
 */
export function getModesForWord(word) {
  return Array.from(modes.values()).filter(mode => 
    canUseMode(mode.id, word)
  );
}

/**
 * 自动选择最佳模式（混排策略）
 * flash 打底，每 4 张插一个产出型模式
 * @param {Object} word
 * @param {number} index
 * @returns {Mode}
 */
export function autoSelectMode(word, index) {
  const outputModes = ['choice-en2cn', 'spelling', 'cloze'];
  const availableOutputModes = outputModes.filter(id => canUseMode(id, word));
  
  // 每 4 张插一个产出型模式
  if (index % 5 === 4 && availableOutputModes.length > 0) {
    const randomIndex = Math.floor(Math.random() * availableOutputModes.length);
    return modes.get(availableOutputModes[randomIndex]);
  }
  
  // 其余用 flash
  return modes.get('flash');
}

export default modes;