/**
 * Service Worker：离线缓存
 */

const CACHE_NAME = 'cet4-vocabulary-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles/base.css',
  '/src/main.js',
  '/src/ui/dom.js',
  '/src/store/db.js',
  '/src/domain/model.js',
  '/src/domain/scheduler.js',
  '/src/domain/queue.js',
  '/src/modes/index.js',
  '/src/modes/flash.js',
  '/src/modes/choice.js',
  '/src/modes/spelling.js',
  '/src/modes/cloze.js',
  '/src/modes/listen.js',
  '/src/modes/shared.js',
  '/src/views/home.js',
  '/src/views/study.js',
  '/src/views/import.js',
  '/src/views/library.js',
  '/src/views/quiz.js',
  '/src/views/mistakes.js',
  '/data/cet4.json'
];

// 安装事件
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// 激活事件
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// 请求事件
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // 缓存命中，返回缓存
        if (response) {
          return response;
        }
        
        // 缓存未命中，发起网络请求
        return fetch(event.request).then((response) => {
          // 检查是否是有效响应
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // 克隆响应
          const responseToCache = response.clone();
          
          // 添加到缓存
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          
          return response;
        });
      })
  );
});