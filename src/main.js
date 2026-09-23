/**
 * 主入口：启动 + 哈希路由 + 全局快捷键
 */

import { openDB } from './store/db.js';
import { mount, loading, emptyState, toast } from './ui/dom.js';
import { createDeck, createCard, normalizeWord } from './domain/model.js';
import { put, bulkAdd, getAll, get } from './store/db.js';

// 路由表
const routes = {
  '/': () => import('./views/home.js'),
  '/import': () => import('./views/import.js'),
  '/library': () => import('./views/library.js'),
  '/study': () => import('./views/study.js'),
  '/quiz': () => import('./views/quiz.js'),
  '/mistakes': () => import('./views/mistakes.js'),
  '/stats': () => import('./views/stats.js'),
  '/settings': () => import('./views/settings.js')
};

/**
 * 全局快捷键（PC）
 */
function setupGlobalShortcuts() {
  document.addEventListener('keydown', (e) => {
    // 忽略输入框
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    // 忽略修饰键组合
    if (e.ctrlKey || e.altKey || e.metaKey) return;

    const hash = window.location.hash.slice(1) || '/';

    // 仅在首页启用导航快捷键
    if (hash === '/' || hash === '') {
      const key = e.key.toLowerCase();
      const shortcuts = {
        's': () => { window.location.hash = '#/study'; },
        'q': () => { window.location.hash = '#/quiz'; },
        'm': () => { window.location.hash = '#/mistakes'; },
        't': () => { window.location.hash = '#/stats'; },
        'i': () => { window.location.hash = '#/import'; },
        'l': () => { window.location.hash = '#/library'; },
        ',': () => { window.location.hash = '#/settings'; }
      };
      if (shortcuts[key]) {
        e.preventDefault();
        shortcuts[key]();
      }
    }

    // 任意页面：Esc 返回首页（学习/测试页面有各自处理）
    if (e.key === 'Escape' && !hash.startsWith('/study') && !hash.startsWith('/quiz')) {
      if (hash !== '/') {
        window.location.hash = '#/';
      }
    }
  });
}

/**
 * 处理路由变化
 */
async function handleRoute() {
  const hash = window.location.hash.slice(1) || '/';
  const segments = hash.split('/').filter(Boolean);
  const path = '/' + (segments[0] || '');
  const params = segments.slice(1).join('/');

  mount(loading('加载中...'));

  try {
    const viewLoader = routes[path] || routes['/'];
    const viewModule = await viewLoader();
    const view = await viewModule.render(params || null);

    if (view) {
      mount(view);
      // 滚动到顶部
      window.scrollTo(0, 0);
    } else {
      mount(emptyState({ title: '页面不存在' }));
    }
  } catch (error) {
    console.error('路由加载失败:', error);
    mount(emptyState({ title: '加载失败', desc: '请刷新重试' }));
  }
}

/**
 * 初始化应用
 */
async function init() {
  try {
    await openDB();
  } catch (error) {
    console.error('数据库初始化失败:', error);
    mount(emptyState({ title: '数据库初始化失败' }));
    return;
  }

  await loadBuiltinDeck();

  // 设置全局快捷键
  setupGlobalShortcuts();

  // 监听路由变化
  window.addEventListener('hashchange', handleRoute);

  // 初始路由
  await handleRoute();
}

/**
 * 加载内置词表（首次启动时）
 */
async function loadBuiltinDeck() {
  const db = await openDB();

  const decks = await getAll(db, 'decks');
  const builtinDeck = decks.find(d => d.source === 'builtin');

  if (builtinDeck) return;

  try {
    const response = await fetch('./data/cet4.json');
    const wordsData = await response.json();

    const words = wordsData
      .map(normalizeWord)
      .filter(w => w && w.id);

    const deck = createDeck({
      name: 'CET4 核心词汇',
      source: 'builtin',
      wordIds: words.map(w => w.id)
    });

    await bulkAdd(db, 'words', words);
    await put(db, 'decks', deck);

    const cards = words.map(w => createCard(deck.id, w.id));
    await bulkAdd(db, 'cards', cards);

    console.log(`内置词书加载完成: ${words.length} 词`);
    toast(`已加载 ${words.length} 个样例单词`);
  } catch (error) {
    console.error('加载内置词表失败:', error);
  }
}

// 启动应用
init();
