/**
 * 词表解析器：支持 CSV/TSV/TXT/JSON 格式，字段嗅探
 * 纯函数，不碰 IO，可直接被 node --test 覆盖
 */

/**
 * @typedef {Object} ParseResult
 * @property {Object[]} words - 解析出的词条数组
 * @property {Object} mapping - 字段映射关系
 * @property {string} format - 检测到的格式
 */

/**
 * 解析词表文件内容
 * @param {string} content - 文件内容
 * @param {string} filename - 文件名（用于格式检测）
 * @returns {ParseResult}
 */
export function parseWordList(content, filename) {
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
    // TXT 格式：尝试检测分隔符
    return parseTXT(content);
  }
}

/**
 * 解析 JSON 格式
 */
function parseJSON(content) {
  try {
    const data = JSON.parse(content);
    
    // 检查是否是数组
    if (!Array.isArray(data)) {
      throw new Error('JSON 必须是数组格式');
    }
    
    // 嗅探字段映射
    const mapping = sniffMapping(data[0] || {});
    
    // 归一化词条
    const words = data.map(item => normalizeItem(item, mapping)).filter(Boolean);
    
    return { words, mapping, format: 'json' };
  } catch (error) {
    throw new Error(`JSON 解析失败: ${error.message}`);
  }
}

/**
 * 解析 CSV/TSV 格式
 */
function parseCSV(content, delimiter = ',') {
  const lines = content.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    throw new Error('文件内容为空');
  }
  
  // 检测是否有表头
  const firstLine = lines[0];
  const hasHeader = detectHeader(firstLine);
  
  let headerLine, dataLines;
  if (hasHeader) {
    headerLine = parseCSVLine(firstLine, delimiter);
    dataLines = lines.slice(1);
  } else {
    // 无表头：假设是「单词 + 释义」两列
    headerLine = ['word', 'def'];
    dataLines = lines;
  }
  
  // 嗅探字段映射
  const mapping = sniffHeaderMapping(headerLine);
  
  // 解析数据行
  const words = [];
  for (const line of dataLines) {
    const values = parseCSVLine(line, delimiter);
    if (values.length < 2) continue; // 至少需要两列
    
    const item = {};
    headerLine.forEach((key, index) => {
      if (index < values.length) {
        item[key] = values[index];
      }
    });
    
    const word = normalizeItem(item, mapping);
    if (word) words.push(word);
  }
  
  return { words, mapping, format: delimiter === '\t' ? 'tsv' : 'csv' };
}

/**
 * 解析 TXT 格式（逐行）
 */
function parseTXT(content) {
  const lines = content.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    throw new Error('文件内容为空');
  }
  
  // 检测分隔符：TAB 或多个空格
  const firstLine = lines[0];
  const hasTab = firstLine.includes('\t');
  const delimiter = hasTab ? '\t' : /\s{2,}/;
  
  // 检测是否有表头
  const hasHeader = detectHeader(firstLine);
  
  let headerLine, dataLines;
  if (hasHeader) {
    headerLine = firstLine.split(delimiter).map(s => s.trim());
    dataLines = lines.slice(1);
  } else {
    headerLine = ['word', 'def'];
    dataLines = lines;
  }
  
  // 嗅探字段映射
  const mapping = sniffHeaderMapping(headerLine);
  
  // 解析数据行
  const words = [];
  for (const line of dataLines) {
    const values = line.split(delimiter).map(s => s.trim());
    if (values.length < 1) continue;
    
    const item = {};
    headerLine.forEach((key, index) => {
      if (index < values.length) {
        item[key] = values[index];
      }
    });
    
    const word = normalizeItem(item, mapping);
    if (word) words.push(word);
  }
  
  return { words, mapping, format: 'txt' };
}

/**
 * 检测是否是表头行
 */
function detectHeader(line) {
  const lower = line.toLowerCase();
  const headerKeywords = ['word', '单词', 'term', 'lemma', 'def', '释义', 'meaning', 'phonetic', '音标', 'example', '例句'];
  return headerKeywords.some(keyword => lower.includes(keyword));
}

/**
 * 嗅探表头字段映射
 */
function sniffHeaderMapping(headers) {
  const mapping = {
    word: null,
    def: null,
    phonetic: null,
    example: null
  };
  
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
  
  // 如果没找到单词字段，假设第一列是单词
  if (!mapping.word && headers.length > 0) {
    mapping.word = headers[0];
  }
  
  // 如果没找到释义字段，假设第二列是释义
  if (!mapping.def && headers.length > 1) {
    mapping.def = headers[1];
  }
  
  return mapping;
}

/**
 * 嗅探数据对象字段映射
 */
function sniffMapping(obj) {
  const keys = Object.keys(obj);
  const mapping = {
    word: null,
    def: null,
    phonetic: null,
    example: null
  };
  
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
  
  // 如果没找到单词字段，假设第一个字段是单词
  if (!mapping.word && keys.length > 0) {
    mapping.word = keys[0];
  }
  
  // 如果没找到释义字段，假设第二个字段是释义
  if (!mapping.def && keys.length > 1) {
    mapping.def = keys[1];
  }
  
  return mapping;
}

/**
 * 归一化数据项为词条对象
 */
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

/**
 * 解析 CSV 行（处理引号包围的字段）
 */
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

/**
 * 生成字段映射预览（用于 UI 确认）
 */
export function generateMappingPreview(words, mapping) {
  if (words.length === 0) return [];
  
  const sample = words.slice(0, 5);
  const preview = [];
  
  for (const word of sample) {
    preview.push({
      word: word.lemma,
      def: word.senses[0]?.defCn || '',
      phonetic: word.phonetic?.uk || '',
      example: word.examples[0]?.en || ''
    });
  }
  
  return preview;
}

/**
 * 验证映射是否有效
 */
export function validateMapping(mapping) {
  const errors = [];
  
  if (!mapping.word) {
    errors.push('未找到单词字段');
  }
  
  if (!mapping.def) {
    errors.push('未找到释义字段');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}