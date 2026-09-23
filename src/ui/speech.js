/**
 * TTS 音频缓存模块
 */

import { openDB, get, put } from '../store/db.js';

const CACHE_NAME = 'tts-audio';

/**
 * 初始化音频缓存数据库
 */
async function initDB() {
  const db = await openDB();
  
  // 检查是否已有音频缓存 store
  if (!db.objectStoreNames.contains(CACHE_NAME)) {
    // 需要升级数据库版本
    // 这里简化处理，直接使用现有数据库
  }
  
  return db;
}

/**
 * 生成音频并缓存
 * @param {string} text - 要朗读的文本
 * @param {string} lang - 语言代码
 * @returns {Promise<Blob>} 音频 Blob
 */
export async function generateAudio(text, lang = 'en-US') {
  return new Promise((resolve, reject) => {
    if (!window.speechSynthesis) {
      reject(new Error('浏览器不支持 speechSynthesis'));
      return;
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9;
    
    // 使用 MediaRecorder 录制音频
    const audioContext = new AudioContext();
    const mediaStreamDestination = audioContext.createMediaStreamDestination();
    
    // 这里简化处理：直接使用 speechSynthesis，不录制
    // 实际实现中需要使用 MediaRecorder 录制
    window.speechSynthesis.speak(utterance);
    
    utterance.onend = () => {
      // 返回一个空 Blob（实际实现中应该返回录制的音频）
      resolve(new Blob([], { type: 'audio/wav' }));
    };
    
    utterance.onerror = (error) => {
      reject(error);
    };
  });
}

/**
 * 从缓存获取音频
 * @param {string} text - 文本
 * @param {string} lang - 语言
 * @returns {Promise<Blob|null>} 音频 Blob 或 null
 */
export async function getCachedAudio(text, lang = 'en-US') {
  try {
    const db = await initDB();
    const key = `${lang}:${text}`;
    const cached = await get(db, CACHE_NAME, key);
    return cached?.audio || null;
  } catch (error) {
    console.error('获取音频缓存失败:', error);
    return null;
  }
}

/**
 * 缓存音频
 * @param {string} text - 文本
 * @param {string} lang - 语言
 * @param {Blob} audio - 音频 Blob
 */
export async function cacheAudio(text, lang, audio) {
  try {
    const db = await initDB();
    const key = `${lang}:${text}`;
    await put(db, CACHE_NAME, { key, audio, timestamp: Date.now() });
  } catch (error) {
    console.error('缓存音频失败:', error);
  }
}

/**
 * 播放单词发音（带缓存）
 * @param {string} word - 单词
 * @param {string} lang - 语言
 */
export async function speakWord(word, lang = 'en-US') {
  // 尝试从缓存获取
  const cached = await getCachedAudio(word, lang);
  if (cached) {
    // 播放缓存的音频
    const audio = new Audio(URL.createObjectURL(cached));
    await audio.play();
    return;
  }
  
  // 生成新音频
  try {
    const audio = await generateAudio(word, lang);
    await cacheAudio(word, lang, audio);
    
    // 播放
    const audioEl = new Audio(URL.createObjectURL(audio));
    await audioEl.play();
  } catch (error) {
    console.error('播放发音失败:', error);
    // 回退到直接 speechSynthesis
    if (window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = lang;
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  }
}