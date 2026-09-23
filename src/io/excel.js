/**
 * Excel 导入模块（可选依赖）
 * 使用 SheetJS 库解析 Excel 文件
 */

/**
 * 解析 Excel 文件
 * @param {File} file - Excel 文件
 * @returns {Promise<Object[]>} 解析出的数据
 */
export async function parseExcel(file) {
  // 动态导入 SheetJS（懒加载）
  try {
    const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs');
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // 读取第一个工作表
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          // 转换为 JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => {
        reject(new Error('读取文件失败'));
      };
      
      reader.readAsArrayBuffer(file);
    });
  } catch (error) {
    throw new Error('SheetJS 库加载失败，请检查网络连接');
  }
}

/**
 * 检测 Excel 文件格式
 * @param {string} filename - 文件名
 * @returns {boolean} 是否是 Excel 文件
 */
export function isExcelFile(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  return ['xlsx', 'xls', 'xlsm'].includes(ext);
}

/**
 * 生成 Excel 导入预览
 * @param {Object[]} data - 解析出的数据
 * @returns {Object} 预览信息
 */
export function generateExcelPreview(data) {
  if (data.length === 0) {
    return { columns: [], sample: [], mapping: {} };
  }
  
  // 获取列名
  const columns = Object.keys(data[0]);
  
  // 嗅探字段映射
  const mapping = {
    word: null,
    def: null,
    phonetic: null,
    example: null
  };
  
  for (const col of columns) {
    const lower = col.toLowerCase();
    
    if (!mapping.word && (lower.includes('word') || lower.includes('单词') || lower.includes('term') || lower.includes('lemma'))) {
      mapping.word = col;
    } else if (!mapping.def && (lower.includes('def') || lower.includes('释义') || lower.includes('meaning') || lower.includes('翻译'))) {
      mapping.def = col;
    } else if (!mapping.phonetic && (lower.includes('phonetic') || lower.includes('音标'))) {
      mapping.phonetic = col;
    } else if (!mapping.example && (lower.includes('example') || lower.includes('例句'))) {
      mapping.example = col;
    }
  }
  
  // 如果没找到单词字段，假设第一列是单词
  if (!mapping.word && columns.length > 0) {
    mapping.word = columns[0];
  }
  
  // 如果没找到释义字段，假设第二列是释义
  if (!mapping.def && columns.length > 1) {
    mapping.def = columns[1];
  }
  
  return {
    columns,
    sample: data.slice(0, 5),
    mapping
  };
}