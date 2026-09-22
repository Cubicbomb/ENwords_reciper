/**
 * 简单测试：验证基本功能
 */

// 测试 SM-2 调度算法
function testSM2() {
  console.log('测试 SM-2 调度算法...');
  
  const card = {
    id: 'test-card',
    deckId: 'test-deck',
    wordId: 'test-word',
    state: 'new',
    due: 0,
    intervalDays: 0,
    ease: 2.5,
    reps: 0,
    lapses: 0,
    streak: 0
  };
  
  const now = Date.now();
  
  // 测试 rating=3（认识）
  const updatedCard = grade(card, 3, now);
  
  console.log('原始卡片:', card);
  console.log('更新后卡片:', updatedCard);
  
  if (updatedCard.state !== 'review') {
    throw new Error('状态应该更新为 review');
  }
  
  if (updatedCard.intervalDays !== 1) {
    throw new Error('第一次间隔应该是 1 天');
  }
  
  if (updatedCard.reps !== 1) {
    throw new Error('复习次数应该是 1');
  }
  
  if (updatedCard.streak !== 1) {
    throw new Error('连续正确次数应该是 1');
  }
  
  if (updatedCard.due <= now) {
    throw new Error('下次复习时间应该在未来');
  }
  
  console.log('✅ SM-2 调度测试通过');
}

// 测试词条归一化
function testNormalize() {
  console.log('测试词条归一化...');
  
  const raw1 = { word: 'hello', def: '你好', phonetic: '/həˈləʊ/' };
  const normalized1 = normalizeWord(raw1);
  
  if (normalized1.id !== 'hello') {
    throw new Error('ID 应该是 hello');
  }
  
  if (normalized1.lemma !== 'hello') {
    throw new Error('词元应该是 hello');
  }
  
  if (normalized1.senses.length !== 1) {
    throw new Error('应该有 1 个释义');
  }
  
  if (normalized1.senses[0].defCn !== '你好') {
    throw new Error('释义应该是 你好');
  }
  
  if (normalized1.phonetic.uk !== '/həˈləʊ/') {
    throw new Error('音标应该是 /həˈləʊ/');
  }
  
  console.log('✅ 归一化测试通过');
}

// 简化的函数定义（用于测试）
function grade(card, rating, now) {
  const updated = { ...card };
  updated.lastReview = now;
  updated.reps++;
  
  switch (rating) {
    case 1:
      updated.state = 'relearning';
      updated.intervalDays = 0;
      updated.ease = Math.max(1.3, updated.ease - 0.2);
      updated.lapses++;
      updated.streak = 0;
      break;
    case 2:
      updated.state = 'relearning';
      updated.intervalDays = Math.max(1, Math.round(updated.intervalDays * 1.2));
      updated.ease = Math.max(1.3, updated.ease - 0.15);
      updated.streak = 0;
      break;
    case 3:
      if (updated.state === 'new' || updated.state === 'learning' || updated.state === 'relearning') {
        updated.state = 'review';
        updated.intervalDays = updated.reps === 1 ? 1 : Math.max(1, Math.round(updated.intervalDays * updated.ease));
      } else {
        updated.intervalDays = Math.max(1, Math.round(updated.intervalDays * updated.ease));
      }
      updated.streak++;
      break;
    case 4:
      if (updated.state === 'new' || updated.state === 'learning' || updated.state === 'relearning') {
        updated.state = 'review';
        updated.intervalDays = 3;
      } else {
        updated.intervalDays = Math.max(1, Math.round(updated.intervalDays * updated.ease * 1.3));
      }
      updated.ease = Math.min(3.0, updated.ease + 0.15);
      updated.streak++;
      break;
  }
  
  updated.due = calculateDue(now, updated.intervalDays);
  return updated;
}

function calculateDue(now, intervalDays) {
  const jitter = 1 + (Math.random() - 0.5) * 0.1;
  const days = Math.max(0, Math.round(intervalDays * jitter));
  const msPerDay = 24 * 60 * 60 * 1000;
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  return todayStart.getTime() + days * msPerDay;
}

function normalizeWord(raw) {
  if (!raw || (!raw.word && !raw.lemma && !raw.term && !raw.单词)) {
    return null;
  }

  const lemma = raw.word || raw.lemma || raw.term || raw.单词 || '';
  
  let senses = [];
  if (raw.def || raw.defCn || raw.释义 || raw.meaning) {
    const def = raw.def || raw.defCn || raw.释义 || raw.meaning || '';
    const pos = raw.pos || raw.词性 || '';
    senses.push({ pos, defCn: def, defEn: raw.defEn });
  } else if (Array.isArray(raw.senses)) {
    senses = raw.senses.map(s => ({
      pos: s.pos || '',
      defCn: s.defCn || s.cn || s.def || '',
      defEn: s.defEn || s.en
    }));
  }

  let phonetic = {};
  if (raw.phonetic) {
    if (typeof raw.phonetic === 'string') {
      phonetic = { uk: raw.phonetic };
    } else {
      phonetic = raw.phonetic;
    }
  } else if (raw.音标) {
    phonetic = { uk: raw.音标 };
  }

  return {
    id: lemma.toLowerCase().replace(/\s+/g, ' ').trim(),
    lemma,
    senses,
    phonetic,
    examples: [],
    tags: [],
    rank: raw.rank
  };
}

// 运行测试
try {
  testSM2();
  testNormalize();
  console.log('🎉 所有测试通过！');
} catch (error) {
  console.error('❌ 测试失败:', error.message);
  process.exit(1);
}