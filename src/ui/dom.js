/**
 * UI 工具：h() 视图函数 + 基础组件
 * 零依赖
 */

/**
 * 创建 DOM 元素
 * @param {string} tag
 * @param {Object} [props]
 * @param {...(string|Node|Array)} children
 * @returns {Node}
 */
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);

  for (const [key, value] of Object.entries(props || {})) {
    if (key === 'className') {
      el.className = value;
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(el.style, value);
    } else if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'dataset') {
      Object.assign(el.dataset, value);
    } else if (value !== null && value !== undefined && value !== false) {
      el.setAttribute(key, value);
    }
  }

  for (const child of children.flat(Infinity)) {
    if (child == null || child === false) continue;
    if (typeof child === 'string' || typeof child === 'number') {
      el.appendChild(document.createTextNode(String(child)));
    } else if (child instanceof Node) {
      el.appendChild(child);
    }
  }

  return el;
}

/**
 * 挂载视图到根节点
 * @param {Node} view
 */
export function mount(view) {
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = '';
    app.appendChild(view);
  }
}

/**
 * 轻提示
 * @param {string} message
 * @param {number} [duration=2000]
 */
export function toast(message, duration = 2000) {
  document.querySelectorAll('.toast').forEach(t => t.remove());

  const el = h('div', { className: 'toast' }, message);
  document.body.appendChild(el);

  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.2s';
    setTimeout(() => el.remove(), 200);
  }, duration);
}

/**
 * 进度条
 * @param {number} current
 * @param {number} total
 * @returns {Node}
 */
export function progressBar(current, total) {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;

  return h('div', { className: 'progress-bar' },
    h('div', {
      className: 'progress-fill',
      style: { width: `${percent}%` }
    })
  );
}

/**
 * 空状态
 * @param {Object} options
 * @param {string} options.title
 * @param {string} [options.desc]
 * @param {Node} [options.action]
 * @returns {Node}
 */
export function emptyState({ title, desc, action }) {
  return h('div', { className: 'empty-state' },
    h('div', { className: 'empty-state-title' }, title),
    desc ? h('div', { className: 'empty-state-desc' }, desc) : null,
    action ? h('div', { style: { marginTop: '16px' } }, action) : null
  );
}

/**
 * 加载中
 * @param {string} [message='加载中']
 * @returns {Node}
 */
export function loading(message = '加载中') {
  return h('div', { className: 'empty-state' },
    h('div', { className: 'spinner', style: { marginBottom: '12px' } }),
    h('div', { className: 'empty-state-desc' }, message)
  );
}
