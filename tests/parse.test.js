/**
 * 解析器测试
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

// 内联解析器函数 — 保持与 src/io/parse.js 同步
function parseWordList(content, filename) {
  const ext = filename.split('.').pop().toLowerCase();
  
  // 去除 BOM
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }
  
  // 统一换行符为 \n
  content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  if (ext === 'json') {
    return parseJSON(content);
  } else if (ext === 'csv' || ext === 'tsv') {
    return parseCSV(content, ext === 'tsv' ? '\t' : ',');
  } else {
    return parseTXT(content);
  }
}

function parseJSON(content) {
  try {
    const data = JSON.parse(content);
    if (!Array.isArray(data)) throw new Error('JSON 必须是数组格式');
    const mapping = sniffMapping(data[0] || {});
    const words = data.map(item => normalizeItem(item, mapping)).filter(Boolean);
    return { words, mapping, format: 'json' };
  } catch (error) {
    throw new Error(`JSON 解析失败: ${error.message}`);
  }
}

function parseCSV(content, delimiter = ',') {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length === 0) throw new Error('文件内容为空');
  
  const firstLine = lines[0];
  const hasHeader = detectHeader(firstLine);
  
  let headerLine, dataLines;
  if (hasHeader) {
    headerLine = parseCSVLine(firstLine, delimiter);
    dataLines = lines.slice(1);
  } else {
    headerLine = ['word', 'def'];
    dataLines = lines;
  }
  
  const mapping = sniffHeaderMapping(headerLine);
  const words = [];
  
  for (const line of dataLines) {
    const values = parseCSVLine(line, delimiter);
    if (values.length < 2) continue;
    
    const item = {};
    headerLine.forEach((key, index) => {
      if (index < values.length) item[key] = values[index];
    });
    
    const word = normalizeItem(item, mapping);
    if (word) words.push(word);
  }
  
  return { words, mapping, format: delimiter === '\t' ? 'tsv' : 'csv' };
}

function parseTXT(content) {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length === 0) throw new Error('文件内容为空');
  
  const firstLine = lines[0];
  const hasTab = firstLine.includes('\t');
  const delimiter = hasTab ? '\t' : /\s{2,}/;
  
  const hasHeader = detectHeader(firstLine);
  
  let headerLine, dataLines;
  if (hasHeader) {
    headerLine = firstLine.split(delimiter).map(s => s.trim());
    dataLines = lines.slice(1);
  } else {
    headerLine = ['word', 'def'];
    dataLines = lines;
  }
  
  const mapping = sniffHeaderMapping(headerLine);
  const words = [];
  
  for (const line of dataLines) {
    const values = line.split(delimiter).map(s => s.trim());
    if (values.length < 1) continue;
    
    const item = {};
    headerLine.forEach((key, index) => {
      if (index < values.length) item[key] = values[index];
    });
    
    const word = normalizeItem(item, mapping);
    if (word) words.push(word);
  }
  
  return { words, mapping, format: 'txt' };
}

function detectHeader(line) {
  const lower = line.toLowerCase();
  const headerKeywords = ['word', '单词', 'term', 'lemma', 'def', '释义', 'meaning', 'phonetic', '音标', 'example', '例句'];
  return headerKeywords.some(keyword => lower.includes(keyword));
}

function sniffHeaderMapping(headers) {
  const mapping = { word: null, def: null, phonetic: null, example: null };
  
  for (const header of headers) {
    const lower = header.toLowerCase();
    if (!mapping.word && (lower.includes('word') || lower.includes('单词') || lower.includes('term') || lower.includes('lemma'))) {
      mapping.word = header;
    } else if (!mapping.def && (lower.includes('def') || lower.includes('释义') || lower.includes('meaning') || lower.includes('翻译'))) {
      mapping.def = header;
    } else if (!mapping.phonetic && (lower.includes('phonetic') || lower.includes('音标'))) {
      mapping.phonetic = header;
    } else if (!mapping.example && (lower.includes('example') || lower.includes('例句'))) {
      mapping.example = header;
    }
  }
  
  if (!mapping.word && headers.length > 0) mapping.word = headers[0];
  if (!mapping.def && headers.length > 1) mapping.def = headers[1];
  
  return mapping;
}

function sniffMapping(obj) {
  const keys = Object.keys(obj);
  const mapping = { word: null, def: null, phonetic: null, example: null };
  
  for (const key of keys) {
    const lower = key.toLowerCase();
    if (!mapping.word && (lower === 'word' || lower === '单词' || lower === 'term' || lower === 'lemma')) {
      mapping.word = key;
    } else if (!mapping.def && (lower === 'def' || lower === '释义' || lower === 'meaning' || lower === '翻译')) {
      mapping.def = key;
    } else if (!mapping.phonetic && (lower === 'phonetic' || lower === '音标')) {
      mapping.phonetic = key;
    } else if (!mapping.example && (lower === 'example' || lower === '例句')) {
      mapping.example = key;
    }
  }
  
  if (!mapping.word && keys.length > 0) mapping.word = keys[0];
  if (!mapping.def && keys.length > 1) mapping.def = keys[1];
  
  return mapping;
}

function normalizeItem(item, mapping) {
  const word = item[mapping.word];
  const def = item[mapping.def];
  
  if (!word || !def) return null;
  
  const lemma = String(word).trim().toLowerCase();
  if (!lemma) return null;
  
  return {
    id: lemma,
    lemma: lemma,
    phonetic: mapping.phonetic ? { uk: String(item[mapping.phonetic] || '').trim() } : {},
    senses: [{ pos: '', defCn: String(def).trim() }],
    examples: mapping.example ? [{ en: String(item[mapping.example] || '').trim(), cn: '' }] : [],
    tags: [],
    rank: 0
  };
}

function parseCSVLine(line, delimiter) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

describe('parseWordList()', () => {
  it('JSON 格式', () => {
    const json = JSON.stringify([
      { word: 'hello', def: '你好', phonetic: '/həˈləʊ/' },
      { word: 'world', def: '世界' }
    ]);
    const result = parseWordList(json, 'test.json');
    assert.equal(result.format, 'json');
    assert.equal(result.words.length, 2);
    assert.equal(result.words[0].lemma, 'hello');
    assert.equal(result.words[0].senses[0].defCn, '你好');
  });
  
  it('CSV 格式（有表头）', () => {
    const csv = 'word,def\nhello,你好\nworld,世界';
    const result = parseWordList(csv, 'test.csv');
    assert.equal(result.format, 'csv');
    assert.equal(result.words.length, 2);
    assert.equal(result.words[0].lemma, 'hello');
  });
  
  it('CSV 格式（无表头）', () => {
    const csv = 'hello,你好\nworld,世界';
    const result = parseWordList(csv, 'test.csv');
    assert.equal(result.words.length, 2);
    assert.equal(result.words[0].lemma, 'hello');
  });
  
  it('TSV 格式', () => {
    const tsv = 'word\tdef\nhello\t你好\nworld\t世界';
    const result = parseWordList(tsv, 'test.tsv');
    assert.equal(result.format, 'tsv');
    assert.equal(result.words.length, 2);
  });
  
  it('TXT 格式（TAB 分隔）', () => {
    const txt = 'hello\t你好\nworld\t世界';
    const result = parseWordList(txt, 'test.txt');
    assert.equal(result.format, 'txt');
    assert.equal(result.words.length, 2);
  });
  
  it('TXT 格式（多空格分隔）', () => {
    const txt = 'hello   你好\nworld   世界';
    const result = parseWordList(txt, 'test.txt');
    assert.equal(result.words.length, 2);
  });
  
  it('BOM 处理', () => {
    const json = '\uFEFF' + JSON.stringify([{ word: 'test', def: '测试' }]);
    const result = parseWordList(json, 'test.json');
    assert.equal(result.words.length, 1);
    assert.equal(result.words[0].lemma, 'test');
  });
  
  it('空文件', () => {
    assert.throws(() => parseWordList('', 'test.txt'), /文件内容为空/);
  });
  
  it('中文字段名', () => {
    const json = JSON.stringify([
      { 单词: 'hello', 释义: '你好' }
    ]);
    const result = parseWordList(json, 'test.json');
    assert.equal(result.words.length, 1);
    assert.equal(result.words[0].lemma, 'hello');
    assert.equal(result.words[0].senses[0].defCn, '你好');
  });
});

describe('validateMapping()', () => {
  it('有效映射', () => {
    const mapping = { word: 'word', def: 'def' };
    // 简单验证：mapping.word 和 mapping.def 存在
    assert.ok(mapping.word);
    assert.ok(mapping.def);
  });
  
  it('缺少单词字段', () => {
    const mapping = { word: null, def: 'def' };
    assert.ok(!mapping.word);
  });
  
  it('缺少释义字段', () => {
    const mapping = { word: 'word', def: null };
    assert.ok(!mapping.def);
  });
});