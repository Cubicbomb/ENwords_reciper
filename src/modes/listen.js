/**
 * 听音模式：优先使用预生成音频，否则用 speechSynthesis
 * 支持听音选词和听写
 */

import { h, toast } from '../ui/dom.js';
import { build as buildChoice } from './choice.js';

/**
 * @typedef {Object} ModeItem
 * @property {Node} question
 * @property {Node} answer
 * @property {(input: any) => 1|2|3|4} check
 */

/**
 * Listen 模式构建器
 * @param {Object} word - 词条对象
 * @param {Object} ctx - 上下文
 * @returns {ModeItem}
 */
export function build(word, ctx = {}) {
  const { lemma, audio, phonetic } = word;

  // 如果没有音频且系统不支持 speechSynthesis，降级为选择题
  if (!audio && !window.speechSynthesis) {
    toast('当前环境不支持语音播放，已切换到选择题模式');
    return buildChoice(word, { ...ctx, modeId: 'choice-en2cn' });
  }

  // 问题面：播放按钮
  const question = h('div', { className: 'listen-question', style: { textAlign: 'center', padding: '20px' } },
    h('div', { style: { fontSize: '18px', color: '#6b7280', marginBottom: '16px' } }, '听音选词'),
    createPlayButton(word, ctx),
    phonetic?.uk ? h('div', { style: { fontSize: '14px', color: '#6b7280', marginTop: '16px' } }, `音标: /${phonetic.uk}/`) : null
  );

  // 选择题答案（听音选词模式）
  const answer = createListenChoice(word, ctx);

  return { question, answer, check: () => null, word };
}

/**
 * 创建播放按钮
 * @param {Object} word
 * @param {Object} ctx
 * @returns {Node}
 */
function createPlayButton(word, ctx) {
  const { lemma, audio } = word;
  
  const playBtn = h('button', {
    className: 'btn btn-primary',
    style: {
      width: '120px',
      height: '120px',
      borderRadius: '50%',
      fontSize: '32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto',
      transition: 'transform 0.2s'
    },
    onClick: async () => {
      playBtn.style.transform = 'scale(0.95)';
      setTimeout(() => playBtn.style.transform = 'scale(1)', 200);
      
      await speak(word);
      
      // 自动播放后显示选项
      ctx.onPlay?.();
    }
  }, '🔊');
  
  return playBtn;
}

/**
 * 创建听音选词的选项
 * @param {Object} word
 * @param {Object} ctx
 * @returns {Node}
 */
function createListenChoice(word, ctx) {
  const { lemma, senses } = word;
  
  // 生成 4 个选项（1 个正确 + 3 个干扰）
  const allWords = ctx.allWords || [];
  const distractors = [];
  
  // 选择干扰项（排除自身）
  const candidates = allWords.filter(w => w.id !== word.id);
  const shuffled = candidates.sort(() => Math.random() - 0.5);
  
  for (let i = 0; i < Math.min(3, shuffled.length); i++) {
    distractors.push(shuffled[i]);
  }
  
  // 组装选项
  const options = [lemma, ...distractors.map(d => d.lemma)].sort(() => Math.random() - 0.5);
  
  const container = h('div', { 
    className: 'listen-options',
    style: { 
      display: 'grid', 
      gridTemplateColumns: 'repeat(2, 1fr)', 
      gap: '12px',
      padding: '16px'
    }
  });

  let answered = false;
  let startTime = Date.now();

  for (const option of options) {
    const btn = h('button', {
      className: 'btn',
      style: {
        padding: '16px',
        borderRadius: '8px',
        border: '2px solid #e5e7eb',
        background: 'white',
        fontSize: '16px',
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s'
      },
      onClick: (e) => {
        if (answered) return;
        
        answered = true;
        const elapsed = Date.now() - startTime;
        const correct = option === lemma;
        
        // 高亮选中项
        e.target.style.borderColor = correct ? '#10b981' : '#ef4444';
        e.target.style.background = correct ? '#d1fae5' : '#fee2e2';
        
        ctx.onComplete?.({
          rating: correct ? 3 : 1,
          correct,
          ms: elapsed,
          answer: option
        });
      }
    }, option);
    
    container.appendChild(btn);
  }

  return container;
}

/**
 * 朗读单词
 * @param {Object} word
 * @returns {Promise<void>}
 */
export async function speak(word) {
  const { lemma, audio } = word;
  
  // 优先使用预生成音频
  if (audio?.uk) {
    try {
      const audioEl = new Audio(audio.uk);
      await audioEl.play();
      return;
    } catch (error) {
      console.warn('预生成音频播放失败，尝试 TTS:', error);
    }
  }
  
  // 使用 speechSynthesis
  if (window.speechSynthesis) {
    // 尝试中文语音
    const voices = window.speechSynthesis.getVoices();
    const enVoice = voices.find(v => v.lang.startsWith('en')) || null;
    
    const utterance = new SpeechSynthesisUtterance(lemma);
    if (enVoice) {
      utterance.voice = enVoice;
    }
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    
    window.speechSynthesis.speak(utterance);
    return;
  }
  
  // 无可用音频源
  toast('无法播放音频');
}

export default { build };