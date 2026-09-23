/**
 * 错词本视图：日志派生 ∪ 手动摘录，持久移除
 */
import { h, mount, toast, emptyState, loading } from '../ui/dom.js';
import { openDB, getAll, get, put, remove } from '../store/db.js';
import { wordId, createFlag } from '../domain/model.js';
import { computeMistakeEntries } from '../domain/mistakes.js';

let state = { entries: [], loading: true };

export async function render() {
  state.loading = true;
  try {
    const db = await openDB();
    const [words, logs, flags] = await Promise.all([
      getAll(db, 'words'),
      getAll(db, 'logs'),
      getAll(db, 'flags')
    ]);
    state.entries = computeMistakeEntries({ words, logs, flags });
  } catch (error) {
    console.error('加载错词失败:', error);
    toast('加载失败');
  } finally {
    state.loading = false;
  }
  return renderView();
}

function renderView() {
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
        h('h1', {}, '错词本')
      ),
      state.entries.length > 0
        ? h('span', { style: { fontSize: '13px', color: 'var(--ink-3)' } },
            `${state.entries.length} 词`)
        : null
    ),

    h('div', { style: { padding: '20px' } },
      // 手动摘录
      renderAddForm(),

      state.loading
        ? loading()
        : state.entries.length === 0
          ? emptyState({
              title: '没有错词',
              desc: '答错的词或手动摘录的词会出现在这里'
            })
          : h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' } },
              ...state.entries.map(entry => renderEntry(entry))
            )
    )
  );
}

function renderAddForm() {
  const input = h('input', {
    type: 'text',
    placeholder: '输入单词摘录到错词本',
    autocomplete: 'off',
    autocapitalize: 'off',
    spellcheck: 'false'
  });

  const submit = async () => {
    const raw = input.value.trim();
    if (!raw) return;
    const id = wordId(raw);
    try {
      const db = await openDB();
      const word = await get(db, 'words', id);
      if (!word) {
        toast('词库中不存在该词');
        return;
      }
      const flags = await getAll(db, 'flags');
      const hasMistake = flags.some(f => f.wordId === id && f.type === 'mistake');
      if (hasMistake || state.entries.some(e => e.word.id === id && e.manual)) {
        toast('已在错词本中');
        return;
      }
      // 摘录：删 ignore（若有）+ 写 mistake
      if (flags.some(f => f.wordId === id && f.type === 'ignore')) {
        await remove(db, 'flags', [id, 'ignore']);
      }
      await put(db, 'flags', createFlag(id, 'mistake'));
      toast('已摘录');
      input.value = '';
      mount(await render());
    } catch (error) {
      console.error(error);
      toast('添加失败');
    }
  };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submit();
  });

  return h('div', { style: { display: 'flex', gap: '8px' } },
    input,
    h('button', {
      className: 'btn btn-primary',
      style: { padding: '8px 14px', flexShrink: '0' },
      onClick: submit
    }, '添加')
  );
}

function renderEntry(entry) {
  const { word, manual, wrongCount, lastWrongAt } = entry;

  return h('div', { className: 'list-item', style: { cursor: 'default' } },
    h('div', { style: { flex: 1, minWidth: 0 } },
      h('div', {
        style: { display: 'flex', alignItems: 'center', gap: '8px' }
      },
        h('span', { className: 'list-item-title' }, word.lemma),
        manual
          ? h('span', { className: 'tag tag-accent' }, '已摘录')
          : null
      ),
      h('div', {
        style: {
          fontSize: '13px',
          color: 'var(--ink-2)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }
      }, word.senses[0]?.defCn || '—'),
      h('div', {
        style: { fontSize: '11px', color: 'var(--ink-3)', marginTop: '2px' }
      }, wrongCount > 0
        ? `错 ${wrongCount} 次 · ${getTimeAgo(lastWrongAt)}`
        : `摘录于 ${getTimeAgo(lastWrongAt)}`)
    ),
    h('button', {
      className: 'btn btn-ghost',
      style: { padding: '6px 10px', fontSize: '13px' },
      onClick: () => removeEntry(entry)
    }, '移除')
  );
}

/**
 * 持久移除：
 * - 手动摘录：删 Flag(mistake)；若同时日志派生（wrongCount>0）再写 Flag(ignore)
 * - 仅日志派生：写 Flag(ignore) 持久抑制
 */
async function removeEntry(entry) {
  const id = entry.word.id;
  try {
    const db = await openDB();
    const flags = await getAll(db, 'flags');
    const hasMistake = flags.some(f => f.wordId === id && f.type === 'mistake');

    if (hasMistake) {
      await remove(db, 'flags', [id, 'mistake']);
    }
    // 有日志错误记录 → 写 ignore，防止刷新后由日志复活
    if (entry.wrongCount > 0) {
      await put(db, 'flags', createFlag(id, 'ignore'));
    }

    toast('已移除');
    mount(await render());
  } catch (error) {
    console.error(error);
    toast('移除失败');
  }
}

function getTimeAgo(timestamp) {
  if (!timestamp) return '刚刚';
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (days > 0) return `${days}天前`;
  if (hours > 0) return `${hours}小时前`;
  if (minutes > 0) return `${minutes}分钟前`;
  return '刚刚';
}
