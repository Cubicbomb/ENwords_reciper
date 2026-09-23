/**
 * 听音模式：speechSynthesis 朗读 + 听音选词，不支持时降级为选择题
 */

import { h, toast } from '../ui/dom.js';
import { makeGuard } from './shared.js';
import { build as buildChoice } from './choice.js';

/**
 * @param {Object} word
 * @param {Object} ctx
 * @returns {import('./shared.js').ModeItem}
 */
export function build(word, ctx = {}) {
  const { lemma, audio, phonetic } = word;
  if (!audio && !window.speechSynthesis) {
    toast('当前环境不支持语音播放，已切换到选择题模式');
    return buildChoice(word, { ...ctx, modeId: 'choice-en2cn' });
  }

  const question = h('div', { style: { textAlign: 'center', padding: '20px' } },
    h('div', { style: { fontSize: '18px', color: '#6b7280', marginBottom: '16px' } }, '听音选词'),
    createPlayButton(word),
    phonetic?.uk ? h('div', { style: { fontSize: '14px', color: '#6b7280', marginTop: '16px' } }, `音标: /${phonetic.uk}/`) : null
  );

  const answer = createListenChoice(word, ctx);
  return { question, answer, check: () => null, word };
}

function createPlayButton(word) {
  const playBtn = h('button', {
    style: {
      width: '120px', height: '120px', borderRadius: '50%', fontSize: '32px',
      display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', transition: 'transform 0.2s'
    },
    onClick: async () => {
      playBtn.style.transform = 'scale(0.95)';
      setTimeout(() => playBtn.style.transform = 'scale(1)', 200);
      await speak(word);
    }
  }, '🔊');
  return playBtn;
}

function createListenChoice(word, ctx) {
  const { lemma } = word;
  const allWords = ctx.allWords || [];
  const candidates = allWords.filter(w => w.id !== word.id).sort(() => Math.random() - 0.5).slice(0, 3);
  const options = [lemma, ...candidates.map(d => d.lemma)].sort(() => Math.random() - 0.5);

  const container = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', padding: '16px' } });
  const startTime = Date.now();
  const { guard } = makeGuard((selected) => {
    const correct = selected === lemma;
    ctx.onComplete?.({ rating: correct ? 3 : 1, correct, ms: Date.now() - startTime, answer: selected });
    return correct ? 3 : 1;
  });

  for (const option of options) {
    container.appendChild(h('button', {
      style: { padding: '16px', borderRadius: '8px', border: '2px solid #e5e7eb', background: 'white', fontSize: '16px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' },
      onClick: (e) => {
        const result = guard(option);
        if (result === undefined) return;
        const correct = option === word.lemma;
        e.target.style.borderColor = correct ? '#10b981' : '#ef4444';
        e.target.style.background = correct ? '#d1fae5' : '#fee2e2';
      }
    }, option));
  }
  return container;
}

export async function speak(word) {
  const { lemma, audio } = word;
  if (audio?.uk) {
    try { await new Audio(audio.uk).play(); return; } catch {}
  }
  
  // 使用 TTS 音频缓存
  try {
    const { speakWord } = await import('../ui/speech.js');
    await speakWord(lemma);
    return;
  } catch (error) {
    console.error('TTS 缓存失败，回退到直接播放:', error);
  }
  
  // 回退到直接 speechSynthesis
  if (window.speechSynthesis) {
    const voices = window.speechSynthesis.getVoices();
    const enVoice = voices.find(v => v.lang.startsWith('en'));
    const u = new SpeechSynthesisUtterance(lemma);
    if (enVoice) u.voice = enVoice;
    u.lang = 'en-US'; u.rate = 0.9;
    window.speechSynthesis.speak(u);
    return;
  }
  toast('无法播放音频');
}

export default { build };
