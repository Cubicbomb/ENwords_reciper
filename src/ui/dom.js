/**
 * UI 工具：h() 视图函数 + 基础组件
 * ~80 行，零依赖
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
  
  // 设置属性
  for (const [key, value] of Object.entries(props || {})) {
    if (key === 'className') {
      el.className = value;
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(el.style, value);
    } else if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'dataset') {
      Object.assign(el.dataset, value);
    } else {
      el.setAttribute(key, value);
    }
  }
  
  // 添加子节点
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
 * 显示轻提示
 * @param {string} message
 * @param {number} [duration=2000]
 */
export function toast(message, duration = 2000) {
  const el = h('div', {
    className: 'toast',
    style: {
      position: 'fixed',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '8px 16px',
      borderRadius: '4px',
      zIndex: '9999',
      transition: 'opacity 0.3s'
    }
  }, message);
  
  document.body.appendChild(el);
  
  setTimeout(() => {
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 300);
  }, duration);
}

/**
 * 进度条组件
 * @param {number} current
 * @param {number} total
 * @returns {Node}
 */
export function progressBar(current, total) {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;
  
  return h('div', { className: 'progress-bar', style: { width: '100%', height: '4px', background: '#e5e7eb', borderRadius: '2px', overflow: 'hidden' } },
    h('div', {
      className: 'progress-fill',
      style: {
        width: `${percent}%`,
        height: '100%',
        background: 'linear-gradient(90deg, #3b82f6, #2563eb)',
        transition: 'width 0.3s ease'
      }
    }),
    h('div', { style: { textAlign: 'center', fontSize: '12px', color: '#6b7280', marginTop: '4px' } }, `${current} / ${total}`)
  );
}

/**
 * 按钮组件
 * @param {Object} options
 * @param {string} options.text
 * @param {string} [options.type='primary']
 * @param {Function} [options.onClick]
 * @param {boolean} [options.disabled=false]
 * @returns {Node}
 */
export function button({ text, type = 'primary', onClick, disabled = false }) {
  const typeClass = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    danger: 'btn-danger'
  }[type] || 'btn-primary';
  
  return h('button', {
    className: `btn ${typeClass}`,
    onClick: disabled ? undefined : onClick,
    disabled: disabled
  }, text);
}

/**
 * 卡片组件
 * @param {Object} options
 * @param {string} [options.title]
 * @param {string} [options.subtitle]
 * @param {Node[]} [options.actions]
 * @returns {Node}
 */
export function card({ title, subtitle, actions = [] }) {
  return h('div', { className: 'card' },
    title ? h('h3', { className: 'card-title' }, title) : null,
    subtitle ? h('p', { className: 'card-subtitle' }, subtitle) : null,
    h('div', { className: 'card-actions' }, ...actions)
  );
}

/**
 * 空状态组件
 * @param {Object} options
 * @param {string} options.message
 * @param {string} [options.icon='📭']
 * @param {Node} [options.action]
 * @returns {Node}
 */
export function emptyState({ message, icon = '📭', action }) {
  return h('div', {
    className: 'empty-state',
    style: { textAlign: 'center', padding: '40px 20px', color: '#6b7280' }
  },
    h('div', { style: { fontSize: '48px', marginBottom: '16px' } }, icon),
    h('p', { style: { fontSize: '16px', marginBottom: '16px' } }, message),
    action || null
  );
}

/**
 * 加载中组件
 * @param {string} [message='加载中...']
 * @returns {Node}
 */
export function loading(message = '加载中...') {
  return h('div', {
    className: 'loading',
    style: { textAlign: 'center', padding: '40px 20px', color: '#6b7280' }
  },
    h('div', { className: 'spinner', style: { marginBottom: '12px' } }),
    h('p', {}, message)
  );
}