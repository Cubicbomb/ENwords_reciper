/**
 * 学习统计视图（空壳）
 */
import { h } from '../ui/dom.js';

export function render() {
  return h('div', { style: { padding: '20px', textAlign: 'center' } },
    h('h2', { style: { marginBottom: '16px' } }, '📊 学习统计'),
    h('p', { style: { color: '#6b7280', marginBottom: '24px' } }, '统计功能开发中'),
    h('button', { className: 'btn btn-secondary', onClick: () => window.location.hash = '#/' }, '← 返回首页')
  );
}
