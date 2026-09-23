/**
 * 单文件打包工具：将应用内联成单个 HTML 文件
 * 零依赖，使用 Node.js 内置模块
 */

import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from 'fs';
import { join, relative } from 'path';

const ROOT_DIR = process.cwd();
const OUTPUT_FILE = join(ROOT_DIR, 'dist', 'index.html');

/**
 * 递归读取目录内容
 */
function readDirRecursive(dir) {
  const files = [];
  const entries = readdirSync(dir);
  
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...readDirRecursive(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  
  return files;
}

/**
 * 内联 CSS 文件
 */
function inlineCSS() {
  const cssDir = join(ROOT_DIR, 'styles');
  const cssFiles = readDirRecursive(cssDir).filter(f => f.endsWith('.css'));
  
  let css = '';
  for (const file of cssFiles) {
    css += readFileSync(file, 'utf8') + '\n';
  }
  
  return css;
}

/**
 * 内联 JS 文件（简单的模块打包）
 */
function inlineJS() {
  const srcDir = join(ROOT_DIR, 'src');
  const jsFiles = readDirRecursive(srcDir).filter(f => f.endsWith('.js'));
  
  // 简单的模块映射（实际项目中需要更复杂的打包逻辑）
  let js = '';
  for (const file of jsFiles) {
    const relativePath = relative(ROOT_DIR, file);
    js += `// === ${relativePath} ===\n`;
    js += readFileSync(file, 'utf8') + '\n\n';
  }
  
  return js;
}

/**
 * 内联词表数据
 */
function inlineData() {
  const dataDir = join(ROOT_DIR, 'data');
  const jsonFiles = readDirRecursive(dataDir).filter(f => f.endsWith('.json'));
  
  let data = '';
  for (const file of jsonFiles) {
    const relativePath = relative(ROOT_DIR, file);
    const content = readFileSync(file, 'utf8');
    data += `window.__DATA__ = window.__DATA__ || {};\n`;
    data += `window.__DATA__['${relativePath}'] = ${content};\n\n`;
  }
  
  return data;
}

/**
 * 生成单文件 HTML
 */
function generateHTML() {
  const html = readFileSync(join(ROOT_DIR, 'index.html'), 'utf8');
  const css = inlineCSS();
  const js = inlineJS();
  const data = inlineData();
  
  // 替换外部引用为内联
  let bundled = html;
  
  // 内联 CSS
  bundled = bundled.replace(
    /<link rel="stylesheet" href="[^"]*">/g,
    `<style>\n${css}\n</style>`
  );
  
  // 内联 JS（替换 module script）
  bundled = bundled.replace(
    /<script type="module" src="[^"]*"><\/script>/g,
    `<script>\n${data}\n${js}\n</script>`
  );
  
  // 移除 PWA 相关（单文件不需要）
  bundled = bundled.replace(/<link rel="manifest"[^>]*>/g, '');
  bundled = bundled.replace(/<meta name="theme-color"[^>]*>/g, '');
  
  return bundled;
}

/**
 * 主函数
 */
function main() {
  console.log('开始打包...');
  
  try {
    // 确保输出目录存在
    mkdirSync(join(ROOT_DIR, 'dist'), { recursive: true });
    
    // 生成单文件
    const html = generateHTML();
    writeFileSync(OUTPUT_FILE, html, 'utf8');
    
    console.log(`打包完成: ${OUTPUT_FILE}`);
    console.log(`文件大小: ${(Buffer.byteLength(html) / 1024).toFixed(2)} KB`);
  } catch (error) {
    console.error('打包失败:', error);
    process.exit(1);
  }
}

// 运行
main();