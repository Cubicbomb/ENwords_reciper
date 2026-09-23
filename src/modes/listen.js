/**
 * 听音模式：speechSynthesis 朗读 + 听音选词
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
    return buildChoice(word, { ...ctx, modeId: 'choice-en2cn' });
  }

  const question = h('div', {
    style: { textAlign: 'center', padding: '16px 0 24px' }
  },
    h('div', {
      style: { fontSize: '13px', color: 'var(--ink-3)', marginBottom: '20px' }
    }, '听音选词'),
    createPlayButton(word),
    phonetic?.uk
      ? h('div', {
          style: {
            fontSize: '14px',
            color: 'var(--ink-3)',
            marginTop: '20px',
            fontFamily: 'monospace'
          }
        }, `/${phonetic.uk}/`)
      : null
  );

  const answer = createListenChoice(word, ctx);
  return { question, answer, check: () => null, word };
}

function createPlayButton(word) {
  return h('button', {
    style: {
      width: '80px',
      height: '80px',
      borderRadius: '50%',
      border: '1.5px solid var(--line)',
      background: 'var(--surface)',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto',
      transition: 'all 0.15s',
      fontSize: '0'
    },
    onClick: async (e) => {
      e.currentTarget.style.background = 'var(--bg)';
      e.currentTarget.style.borderColor = 'var(--ink-3)';
      setTimeout(() => {
        e.currentTarget.style.background = 'var(--surface)';
        e.currentTarget.style.borderColor = 'var(--line)';
      }, 200);
      await speak(word);
    }
  },
    // 播放图标（简洁三角形）
    h('div', {
      style: {
        width: '0',
        height: '0',
        borderStyle: 'solid',
        borderWidth: '10px 0 10px 18px',
        borderColor: 'transparent transparent transparent var(--ink)',
        marginLeft: '4px'
      }
    })
  );
}

function createListenChoice(word, ctx) {
  const { lemma } = word;
  const allWords = ctx.allWords || [];
  const candidates = allWords
    .filter(w => w.id !== word.id)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);
  const options = [lemma, ...candidates.map(d => d.lemma)]
    .sort(() => Math.random() - 0.5);

  const container = h('div', {
    style: { display: 'flex', flexDirection: 'column', gap: '8px' }
  });

  const startTime = Date.now();
  const { guard } = makeGuard((selected) => {
    const correct = selected === lemma;
    ctx.onComplete?.({
      rating: correct ? 3 : 1,
      correct,
      ms: Date.now() - startTime,
      answer: selected
    });
    return correct ? 3 : 1;
  });

  for (const option of options) {
    container.appendChild(h('button', {
      className: 'list-item',
      style: { justifyContent: 'flex-start' },
      onClick: (e) => {
        const result = guard(option);
        if (result === undefined) return;
        const correct = option === word.lemma;
        e.currentTarget.style.borderColor = correct ? 'var(--green)' : 'var(--red)';
        e.currentTarget.style.color = correct ? 'var(--green)' : 'var(--red)';
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

  try {
    const { speakWord } = await import('../ui/speech.js');
    await speakWord(lemma);
    return;
  } catch (error) {
    console.error('TTS 失败:', error);
  }

  if (window.speechSynthesis) {
    const voices = window.speechSynthesis.getVoices();
    const enVoice = voices.find(v => v.lang.startsWith('en'));
    const u = new SpeechSynthesisUtterance(lemma);
    if (enVoice) u.voice = enVoice;
    u.lang = 'en-US';
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
    return;
  }
  toast('无法播放音频');
}

export default { build };
