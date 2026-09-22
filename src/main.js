/**
 * 主入口：启动 + 哈希路由 + 视图切换
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
  '/mistakes': () => import('./views/mistakes.js'),
  '/stats': () => import('./views/stats.js'),
  '/settings': () => import('./views/settings.js')
};

// 当前视图模块
let currentView = null;

/**
 * 处理路由变化
 */
async function handleRoute() {
  const hash = window.location.hash.slice(1) || '/';
  const [path, ...paramParts] = hash.split('/');
  const params = paramParts.join('/');

  // 显示加载中
  mount(loading('加载中...'));

  try {
    // 动态导入视图模块
    const viewLoader = routes[path] || routes['/'];
    const viewModule = await viewLoader();
    
    // 调用视图的 render 方法
    currentView = viewModule;
    const view = await viewModule.render(params);
    
    if (view) {
      mount(view);
    } else {
      mount(emptyState({
        message: '页面不存在',
        icon: '❓'
      }));
    }
  } catch (error) {
    console.error('路由加载失败:', error);
    mount(emptyState({
      message: '加载失败，请刷新重试',
      icon: '❌'
    }));
  }
}

/**
 * 初始化应用
 */
async function init() {
  console.log('CET4 背单词应用启动中...');

  // 打开数据库
  try {
    await openDB();
    console.log('IndexedDB 初始化成功');
  } catch (error) {
    console.error('数据库初始化失败:', error);
    mount(emptyState({
      message: '数据库初始化失败',
      icon: '💾'
    }));
    return;
  }

  // 加载内置词表
  await loadBuiltinDeck();

  // 监听路由变化
  window.addEventListener('hashchange', handleRoute);
  
  // 初始路由
  await handleRoute();
  
  toast('欢迎使用 CET4 背单词应用');
}

/**
 * 加载内置词表（首次启动时）
 */
async function loadBuiltinDeck() {
  const db = await openDB();
  
  // 检查是否已有内置词书
  const decks = await getAll(db, 'decks');
  const builtinDeck = decks.find(d => d.source === 'builtin');
  
  if (builtinDeck) {
    console.log('内置词书已存在，跳过加载');
    return;
  }

  // 加载样例数据
  try {
    const response = await fetch('./data/cet4.json');
    const wordsData = await response.json();
    
    // 归一化词条
    const words = wordsData
      .map(normalizeWord)
      .filter(w => w && w.id);
    
    // 创建内置词书
    const deck = createDeck({
      name: 'CET4 核心词汇',
      source: 'builtin',
      wordIds: words.map(w => w.id)
    });
    
    // 批量写入
    await bulkAdd(db, 'words', words);
    await put(db, 'decks', deck);
    
    // 为每个词条创建新卡片
    const cards = words.map(w => createCard(deck.id, w.id));
    await bulkAdd(db, 'cards', cards);
    
    console.log(`内置词书加载完成: ${words.length} 词`);
    toast(`已加载 ${words.length} 个样例单词`);
  } catch (error) {
    console.error('加载内置词表失败:', error);
    // 不阻断启动，用户可通过导入功能添加词表
  }
}

// 启动应用
init();