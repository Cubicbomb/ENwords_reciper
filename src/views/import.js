/**
 * 导入词表视图
 */
import { h, mount, toast } from '../ui/dom.js';
import { openDB, bulkAdd, put, getAll } from '../store/db.js';
import { createDeck, createCard } from '../domain/model.js';
import { parseWordList, generateMappingPreview, validateMapping } from '../io/parse.js';

let state = {
  file: null,
  content: null,
  parseResult: null,
  mapping: null,
  preview: [],
  importing: false
};

export async function render() {
  return h('div', { style: { padding: '20px', maxWidth: '600px', margin: '0 auto' } },
    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' } },
      h('h2', { style: { margin: 0 } }, '➕ 导入词表'),
      h('button', { className: 'btn btn-secondary', onClick: () => window.location.hash = '#/' }, '← 返回')
    ),
    
    // 文件选择区域
    h('div', { className: 'card', style: { padding: '20px', marginBottom: '20px' } },
      h('h3', { style: { marginTop: 0, marginBottom: '12px' } }, '选择文件'),
      h('p', { style: { color: '#6b7280', marginBottom: '12px', fontSize: '14px' } }, '支持 CSV / TSV / TXT / JSON 格式'),
      h('input', {
        type: 'file',
        accept: '.csv,.tsv,.txt,.json',
        onChange: handleFileSelect,
        style: { width: '100%', padding: '8px' }
      })
    ),
    
    // 映射预览区域
    state.parseResult ? renderMappingPreview() : null,
    
    // 导入按钮
    state.parseResult ? renderImportButton() : null
  );
}

function handleFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  state.file = file;
  
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      state.content = event.target.result;
      state.parseResult = parseWordList(state.content, file.name);
      state.mapping = state.parseResult.mapping;
      state.preview = generateMappingPreview(state.parseResult.words, state.mapping);
      
      mount(render());
      toast(`成功解析 ${state.parseResult.words.length} 个词条`);
    } catch (error) {
      toast(`解析失败: ${error.message}`);
      console.error(error);
    }
  };
  reader.readAsText(file);
}

function renderMappingPreview() {
  const validation = validateMapping(state.mapping);
  
  return h('div', { className: 'card', style: { padding: '20px', marginBottom: '20px' } },
    h('h3', { style: { marginTop: 0, marginBottom: '12px' } }, '字段映射预览'),
    
    // 映射状态
    h('div', { style: { marginBottom: '16px', padding: '12px', background: validation.valid ? '#f0fdf4' : '#fef2f2', borderRadius: '8px' } },
      validation.valid 
        ? h('p', { style: { margin: 0, color: '#166534' } }, '✅ 映射有效')
        : h('p', { style: { margin: 0, color: '#991b1b' } }, `❌ ${validation.errors.join(', ')}`)
    ),
    
    // 映射详情
    h('div', { style: { marginBottom: '16px' } },
      h('p', { style: { margin: '0 0 8px 0', fontWeight: 'bold' } }, '字段映射:'),
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' } },
        h('div', { style: { padding: '8px', background: '#f9fafb', borderRadius: '4px' } },
          h('div', { style: { fontSize: '12px', color: '#6b7280' } }, '单词字段'),
          h('div', { style: { fontWeight: 'bold' } }, state.mapping.word || '未检测到')
        ),
        h('div', { style: { padding: '8px', background: '#f9fafb', borderRadius: '4px' } },
          h('div', { style: { fontSize: '12px', color: '#6b7280' } }, '释义字段'),
          h('div', { style: { fontWeight: 'bold' } }, state.mapping.def || '未检测到')
        )
      )
    ),
    
    // 预览表格
    state.preview.length > 0 ? renderPreviewTable() : null,
    
    // 统计信息
    h('p', { style: { color: '#6b7280', fontSize: '14px' } }, 
      `共解析 ${state.parseResult.words.length} 个词条，格式: ${state.parseResult.format.toUpperCase()}`
    )
  );
}

function renderPreviewTable() {
  return h('div', { style: { marginBottom: '16px', overflowX: 'auto' } },
    h('p', { style: { margin: '0 0 8px 0', fontWeight: 'bold' } }, '前 5 条预览:'),
    h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' } },
      h('thead', {},
        h('tr', {},
          h('th', { style: { padding: '8px', border: '1px solid #e5e7eb', textAlign: 'left' } }, '单词'),
          h('th', { style: { padding: '8px', border: '1px solid #e5e7eb', textAlign: 'left' } }, '释义'),
          h('th', { style: { padding: '8px', border: '1px solid #e5e7eb', textAlign: 'left' } }, '音标'),
          h('th', { style: { padding: '8px', border: '1px solid #e5e7eb', textAlign: 'left' } }, '例句')
        )
      ),
      h('tbody', {},
        ...state.preview.map(item => 
          h('tr', {},
            h('td', { style: { padding: '8px', border: '1px solid #e5e7eb' } }, item.word),
            h('td', { style: { padding: '8px', border: '1px solid #e5e7eb' } }, item.def),
            h('td', { style: { padding: '8px', border: '1px solid #e5e7eb' } }, item.phonetic),
            h('td', { style: { padding: '8px', border: '1px solid #e5e7eb', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, item.example)
          )
        )
      )
    )
  );
}

function renderImportButton() {
  const validation = validateMapping(state.mapping);
  
  return h('div', { className: 'card', style: { padding: '20px', textAlign: 'center' } },
    h('button', {
      className: 'btn btn-primary',
      disabled: !validation.valid || state.importing,
      onClick: handleImport,
      style: { padding: '12px 24px', fontSize: '16px' }
    }, state.importing ? '导入中...' : `导入 ${state.parseResult.words.length} 个词条`)
  );
}

async function handleImport() {
  if (!state.parseResult || state.importing) return;
  
  state.importing = true;
  mount(render());
  
  try {
    const db = await openDB();
    
    // 检查是否已有同名词书
    const decks = await getAll(db, 'decks');
    const existingDeck = decks.find(d => d.name === state.file.name);
    
    if (existingDeck) {
      if (!confirm(`已存在同名词书「${existingDeck.name}」，是否覆盖？`)) {
        state.importing = false;
        mount(render());
        return;
      }
    }
    
    // 创建词书
    const deck = createDeck({
      name: state.file.name,
      source: 'import',
      wordIds: state.parseResult.words.map(w => w.id)
    });
    
    // 批量写入词条
    await bulkAdd(db, 'words', state.parseResult.words);
    
    // 写入词书
    await put(db, 'decks', deck);
    
    // 为每个词条创建卡片
    const cards = state.parseResult.words.map(w => createCard(deck.id, w.id));
    await bulkAdd(db, 'cards', cards);
    
    toast(`成功导入 ${state.parseResult.words.length} 个词条`);
    
    // 跳转到词书库
    window.location.hash = '#/library';
  } catch (error) {
    toast(`导入失败: ${error.message}`);
    console.error(error);
  } finally {
    state.importing = false;
    mount(render());
  }
}