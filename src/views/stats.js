/**
 * 学习统计视图
 */
import { h, emptyState } from '../ui/dom.js';
import { openDB, getAll } from '../store/db.js';

export async function render() {
  let stats = { totalLogs: 0, correct: 0, totalWords: 0, mastered: 0 };

  try {
    const db = await openDB();
    const logs = await getAll(db, 'logs');
    const cards = await getAll(db, 'cards');
    const words = await getAll(db, 'words');

    stats = {
      totalLogs: logs.length,
      correct: logs.filter(l => l.correct).length,
      totalWords: words.length,
      mastered: cards.filter(c => c.state === 'review' && c.intervalDays >= 7).length
    };
  } catch (e) {
    console.error(e);
  }

  const accuracy = stats.totalLogs > 0
    ? Math.round((stats.correct / stats.totalLogs) * 100)
    : 0;

  return h('div', { className: 'fade-in' },
    // 顶栏
    h('header', {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '16px 20px',
        borderBottom: '1px solid var(--line)'
      }
    },
      h('button', {
        className: 'btn btn-ghost',
        style: { padding: '4px 8px', marginLeft: '-8px' },
        onClick: () => window.location.hash = '#/'
      }, '←'),
      h('h1', {}, '学习统计')
    ),

    h('div', { style: { padding: '20px' } },
      // 主指标
      h('section', { style: { marginBottom: '24px', textAlign: 'center', padding: '24px 0' } },
        h('div', {
          style: {
            fontSize: '56px',
            fontWeight: '600',
            letterSpacing: '-0.03em',
            lineHeight: '1'
          }
        }, `${accuracy}%`),
        h('div', {
          style: { fontSize: '13px', color: 'var(--ink-3)', marginTop: '8px' }
        }, '总体正确率')
      ),

      // 详细数据
      h('section', { style: { marginBottom: '24px' } },
        h('div', { className: 'section-title' }, '数据'),
        h('div', {
          style: {
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '1px',
            background: 'var(--line)',
            border: '1px solid var(--line)',
            borderRadius: '8px',
            overflow: 'hidden'
          }
        },
          statCell('总词条', stats.totalWords),
          statCell('已掌握', stats.mastered),
          statCell('答题次数', stats.totalLogs),
          statCell('答对次数', stats.correct)
        )
      ),

      // 图表占位
      h('section',
        h('div', { className: 'section-title' }, '趋势'),
        emptyState({
          title: '图表开发中',
          desc: '学习趋势图即将上线'
        })
      )
    )
  );
}

function statCell(label, value) {
  return h('div', {
    style: {
      background: 'var(--surface)',
      padding: '16px 12px',
      textAlign: 'center'
    }
  },
    h('div', {
      style: { fontSize: '24px', fontWeight: '600', letterSpacing: '-0.02em' }
    }, String(value)),
    h('div', {
      style: { fontSize: '11px', color: 'var(--ink-3)', marginTop: '4px' }
    }, label)
  );
}
