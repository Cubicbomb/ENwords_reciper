/**
 * 设置视图
 */
import { h, mount, toast } from '../ui/dom.js';
import { exportAll, downloadJSON, importData, checkBackupReminder, updateLastExportTime } from '../io/export.js';

let state = { loading: false };

export async function render() {
  state.loading = false;

  const needsBackup = await checkBackupReminder();
  if (needsBackup) {
    setTimeout(() => toast('建议导出数据备份'), 1000);
  }

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
      h('h1', {}, '设置')
    ),

    h('div', { style: { padding: '20px' } },
      // 数据管理
      h('section', { style: { marginBottom: '28px' } },
        h('div', { className: 'section-title' }, '数据'),

        h('button', {
          className: 'btn btn-primary btn-block',
          onClick: handleExport,
          disabled: state.loading,
          style: { marginBottom: '8px' }
        }, state.loading ? '导出中...' : '导出数据备份'),

        h('div', { style: { display: 'flex', gap: '8px', marginBottom: '8px' } },
          h('button', {
            className: 'btn btn-secondary',
            style: { flex: 1 },
            onClick: () => handleImport('merge'),
            disabled: state.loading
          }, '合并导入'),
          h('button', {
            className: 'btn btn-secondary',
            style: { flex: 1, color: 'var(--red)' },
            onClick: () => handleImport('replace'),
            disabled: state.loading
          }, '覆盖导入')
        ),

        h('p', {
          style: { fontSize: '12px', color: 'var(--ink-3)', lineHeight: '1.5' }
        }, '合并保留现有数据并添加新数据；覆盖会清空现有数据')
      ),

      // 关于
      h('section',
        h('div', { className: 'section-title' }, '关于'),
        h('div', {
          style: {
            padding: '14px 16px',
            background: 'var(--bg)',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--line)'
          }
        },
          h('div', { style: { fontSize: '14px', fontWeight: '500', marginBottom: '4px' } }, 'CET4 背单词'),
          h('div', { style: { fontSize: '13px', color: 'var(--ink-3)' } }, 'v0.1.0 · 零依赖纯前端')
        )
      )
    )
  );
}

async function handleExport() {
  state.loading = true;
  mount(render());
  try {
    const data = await exportAll();
    const filename = `cet4-backup-${new Date().toISOString().split('T')[0]}.json`;
    downloadJSON(data, filename);
    await updateLastExportTime();
    toast('导出成功');
  } catch (error) {
    console.error(error);
    toast('导出失败');
  } finally {
    state.loading = false;
    mount(render());
  }
}

async function handleImport(strategy) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';

  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (strategy === 'replace' && !confirm('覆盖导入将清空现有数据，确定？')) return;

    state.loading = true;
    mount(render());

    try {
      const result = await importData(file, strategy);
      toast(`已导入 ${result.stats.words} 个词条`);
      window.location.hash = '#/';
    } catch (error) {
      console.error(error);
      toast('导入失败');
    } finally {
      state.loading = false;
      mount(render());
    }
  };

  input.click();
}
