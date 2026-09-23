/**
 * 设置视图
 */
import { h, toast } from '../ui/dom.js';
import { exportAll, downloadJSON, importData, checkBackupReminder, updateLastExportTime } from '../io/export.js';

let state = {
  loading: false,
  lastExportTime: null
};

export async function render() {
  state.loading = false;
  
  // 检查是否需要备份提示
  const needsBackup = await checkBackupReminder();
  if (needsBackup) {
    setTimeout(() => {
      toast('建议导出数据备份（超过 7 天未备份）');
    }, 1000);
  }
  
  return h('div', { style: { padding: '20px', maxWidth: '600px', margin: '0 auto' } },
    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' } },
      h('h2', { style: { margin: 0 } }, '⚙️ 设置'),
      h('button', { className: 'btn btn-secondary', onClick: () => window.location.hash = '#/' }, '← 返回')
    ),
    
    // 数据管理
    h('div', { className: 'card', style: { padding: '20px', marginBottom: '20px' } },
      h('h3', { style: { marginTop: 0, marginBottom: '16px' } }, '📦 数据管理'),
      
      // 导出按钮
      h('button', {
        className: 'btn btn-primary',
        onClick: handleExport,
        disabled: state.loading,
        style: { width: '100%', padding: '12px', marginBottom: '12px' }
      }, state.loading ? '导出中...' : '导出数据备份'),
      
      // 导入区域
      h('div', { style: { marginTop: '16px' } },
        h('p', { style: { margin: '0 0 8px 0', fontWeight: 'bold' } }, '导入数据:'),
        h('div', { style: { display: 'flex', gap: '8px', marginBottom: '8px' } },
          h('button', {
            className: 'btn btn-secondary',
            onClick: () => handleImport('merge'),
            disabled: state.loading,
            style: { flex: 1 }
          }, '合并导入'),
          h('button', {
            className: 'btn btn-danger',
            onClick: () => handleImport('replace'),
            disabled: state.loading,
            style: { flex: 1 }
          }, '覆盖导入')
        ),
        h('p', { style: { margin: 0, color: '#6b7280', fontSize: '12px' } },
          '合并：保留现有数据，添加新数据；覆盖：清空现有数据后导入'
        )
      )
    ),
    
    // 关于
    h('div', { className: 'card', style: { padding: '20px' } },
      h('h3', { style: { marginTop: 0, marginBottom: '12px' } }, 'ℹ️ 关于'),
      h('p', { style: { margin: 0, color: '#6b7280' } }, 'CET4 背单词应用 v0.1.0'),
      h('p', { style: { margin: '8px 0 0 0', color: '#6b7280' } }, '极简、可携带、零依赖')
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
    toast('数据导出成功');
  } catch (error) {
    console.error('导出失败:', error);
    toast('导出失败: ' + error.message);
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
    
    if (strategy === 'replace') {
      if (!confirm('覆盖导入将清空现有数据，确定继续吗？')) {
        return;
      }
    }
    
    state.loading = true;
    mount(render());
    
    try {
      const result = await importData(file, strategy);
      toast(`导入成功: ${result.stats.words} 个词条, ${result.stats.decks} 本词书`);
      window.location.hash = '#/';
    } catch (error) {
      console.error('导入失败:', error);
      toast('导入失败: ' + error.message);
    } finally {
      state.loading = false;
      mount(render());
    }
  };
  
  input.click();
}

// 需要导入 mount 函数
import { mount } from '../ui/dom.js';