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
  importing: false,
  isExcel: false
};

export async function render() {
  return h('div', { className: 'fade-in' },
    // 顶栏
    h('header', {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 20px',
        borderBottom: '1px solid var(--line)'
      }
    },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
        h('button', {
          className: 'btn btn-ghost',
          style: { padding: '4px 8px', marginLeft: '-8px' },
          onClick: () => window.location.hash = '#/'
        }, '←'),
        h('h1', {}, '导入词表')
      )
    ),

    h('div', { style: { padding: '20px' } },
      // 文件选择
      h('section', { style: { marginBottom: '24px' } },
        h('div', { className: 'section-title' }, '选择文件'),
        h('p', {
          style: { fontSize: '13px', color: 'var(--ink-3)', marginBottom: '12px' }
        }, '支持 CSV / TSV / TXT / JSON / Excel'),
        h('input', {
          type: 'file',
          accept: '.csv,.tsv,.txt,.json,.xlsx,.xls,.xlsm',
          onChange: handleFileSelect
        })
      ),

      // 映射预览
      state.parseResult ? renderMappingPreview() : null,

      // 导入按钮
      state.parseResult ? renderImportButton() : null
    )
  );
}

function handleFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;

  state.file = file;
  const ext = file.name.split('.').pop().toLowerCase();
  state.isExcel = ['xlsx', 'xls', 'xlsm'].includes(ext);

  if (state.isExcel) {
    handleExcelFile(file);
  } else {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        state.content = event.target.result;
        state.parseResult = parseWordList(state.content, file.name);
        state.mapping = state.parseResult.mapping;
        state.preview = generateMappingPreview(state.parseResult.words, state.mapping);
        mount(render());
        toast(`解析 ${state.parseResult.words.length} 个词条`);
      } catch (error) {
        toast(`解析失败: ${error.message}`);
        console.error(error);
      }
    };
    reader.readAsText(file);
  }
}

function renderMappingPreview() {
  const validation = validateMapping(state.mapping);

  return h('section', { style: { marginBottom: '24px' } },
    h('div', { className: 'section-title' }, '字段映射'),

    // 状态
    h('div', {
      style: {
        padding: '10px 12px',
        borderRadius: 'var(--radius)',
        background: validation.valid ? 'var(--bg)' : '#fef2f2',
        border: `1px solid ${validation.valid ? 'var(--line)' : '#fecaca'}`,
        marginBottom: '12px',
        fontSize: '13px',
        color: validation.valid ? 'var(--ink-2)' : 'var(--red)'
      }
    }, validation.valid ? '映射有效' : validation.errors.join(', ')),

    // 字段
    h('div', {
      style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }
    },
      mappingCell('单词', state.mapping.word),
      mappingCell('释义', state.mapping.def)
    ),

    // 预览表格
    state.preview.length > 0 ? renderPreviewTable() : null,

    // 统计
    h('div', {
      style: { fontSize: '13px', color: 'var(--ink-3)' }
    }, `${state.parseResult.words.length} 个词条 · ${state.parseResult.format.toUpperCase()}`)
  );
}

function mappingCell(label, value) {
  return h('div', {
    style: {
      padding: '10px 12px',
      background: 'var(--bg)',
      borderRadius: 'var(--radius)',
      border: '1px solid var(--line)'
    }
  },
    h('div', { style: { fontSize: '11px', color: 'var(--ink-3)', marginBottom: '2px' } }, label),
    h('div', { style: { fontSize: '14px', fontWeight: '500' } }, value || '未检测到')
  );
}

function renderPreviewTable() {
  return h('div', { style: { marginBottom: '16px', overflowX: 'auto' } },
    h('div', { className: 'section-title', style: { paddingBottom: '6px' } }, '预览'),
    h('table', {
      style: {
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '13px',
        border: '1px solid var(--line)',
        borderRadius: 'var(--radius)',
        overflow: 'hidden'
      }
    },
      h('thead', {},
        h('tr', {},
          ['单词', '释义'].map(th =>
            h('th', {
              style: {
                padding: '8px 10px',
                background: 'var(--bg)',
                textAlign: 'left',
                fontWeight: '500',
                fontSize: '11px',
                color: 'var(--ink-3)',
                borderBottom: '1px solid var(--line)'
              }
            }, th)
          )
        )
      ),
      h('tbody', {},
        ...state.preview.slice(0, 5).map(item =>
          h('tr', {},
            h('td', {
              style: {
                padding: '8px 10px',
                borderBottom: '1px solid var(--line)',
                fontWeight: '500'
              }
            }, item.word),
            h('td', {
              style: {
                padding: '8px 10px',
                borderBottom: '1px solid var(--line)',
                color: 'var(--ink-2)'
              }
            }, item.def)
          )
        )
      )
    )
  );
}

function renderImportButton() {
  const validation = validateMapping(state.mapping);
  return h('section', {},
    h('button', {
      className: 'btn btn-primary btn-block',
      disabled: !validation.valid || state.importing,
      onClick: handleImport,
      style: { padding: '12px' }
    }, state.importing ? '导入中...' : `导入 ${state.parseResult.words.length} 个词条`)
  );
}

async function handleImport() {
  if (!state.parseResult || state.importing) return;
  state.importing = true;
  mount(render());

  try {
    const db = await openDB();
    const decks = await getAll(db, 'decks');
    const existingDeck = decks.find(d => d.name === state.file.name);

    if (existingDeck && !confirm(`「${existingDeck.name}」已存在，覆盖？`)) {
      state.importing = false;
      mount(render());
      return;
    }

    const deck = createDeck({
      name: state.file.name,
      source: 'import',
      wordIds: state.parseResult.words.map(w => w.id)
    });

    await bulkAdd(db, 'words', state.parseResult.words);
    await put(db, 'decks', deck);

    const cards = state.parseResult.words.map(w => createCard(deck.id, w.id));
    await bulkAdd(db, 'cards', cards);

    toast(`已导入 ${state.parseResult.words.length} 个词条`);
    window.location.hash = '#/library';
  } catch (error) {
    toast(`导入失败: ${error.message}`);
    console.error(error);
  } finally {
    state.importing = false;
    mount(render());
  }
}

async function handleExcelFile(file) {
  try {
    const { parseExcel, generateExcelPreview } = await import('../io/excel.js');
    toast('解析 Excel...');
    const data = await parseExcel(file);
    const preview = generateExcelPreview(data);

    const words = data.map(item => {
      const word = item[preview.mapping.word];
      const def = item[preview.mapping.def];
      if (!word || !def) return null;
      return {
        id: String(word).trim().toLowerCase(),
        lemma: String(word).trim().toLowerCase(),
        phonetic: preview.mapping.phonetic ? { uk: String(item[preview.mapping.phonetic] || '').trim() } : {},
        senses: [{ pos: '', defCn: String(def).trim() }],
        examples: preview.mapping.example ? [{ en: String(item[preview.mapping.example] || '').trim(), cn: '' }] : [],
        tags: [],
        rank: 0
      };
    }).filter(Boolean);

    state.parseResult = { words, mapping: preview.mapping, format: 'excel' };
    state.mapping = preview.mapping;
    state.preview = preview.sample.map(item => ({
      word: item[preview.mapping.word] || '',
      def: item[preview.mapping.def] || '',
      phonetic: item[preview.mapping.phonetic] || '',
      example: item[preview.mapping.example] || ''
    }));

    mount(render());
    toast(`解析 ${words.length} 个词条`);
  } catch (error) {
    toast(`Excel 解析失败: ${error.message}`);
    console.error(error);
  }
}
