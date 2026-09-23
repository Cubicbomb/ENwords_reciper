import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('D:/nodejs/node_cache/_npx/e41f203b7505f1fb/node_modules/playwright');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = 'http://localhost:5173';

function readFlags(page) {
  return page.evaluate(() => new Promise((resolve) => {
    const req = indexedDB.open('cet4');
    req.onsuccess = () => {
      const tx = req.result.transaction('flags', 'readonly');
      const g = tx.objectStore('flags').getAll();
      g.onsuccess = () => resolve(g.result || []);
      g.onerror = () => resolve([]);
    };
    req.onerror = () => resolve([]);
    setTimeout(() => resolve(['timeout']), 2000);
  }));
}

async function main() {
  const browser = await chromium.launch({ executablePath: EDGE, headless: true });
  const page = await browser.newPage();
  const results = [];
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(String(err)));

  try {
    await page.goto(`${BASE}/#/`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(3000);

    await page.goto(`${BASE}/#/mistakes`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1500);

    const sample = await page.evaluate(() => new Promise((resolve) => {
      const req = indexedDB.open('cet4');
      req.onsuccess = () => {
        const g = req.result.transaction('words', 'readonly').objectStore('words').getAll();
        g.onsuccess = () => {
          const words = g.result || [];
          resolve(words.find(w => w.lemma?.length > 3)?.lemma || '');
        };
      };
      setTimeout(() => resolve(''), 2000);
    }));

    const flagsBefore = await readFlags(page);
    console.log('flags before:', JSON.stringify(flagsBefore));

    const input = await page.$('input[placeholder*="摘录"]');
    await input.fill(sample);
    await page.click('button:has-text("添加")');
    await page.waitForTimeout(2000);

    const flagsAfter = await readFlags(page);
    console.log('flags after:', JSON.stringify(flagsAfter));
    const body = await page.textContent('body');
    console.log('body has 已摘录:', body.includes('已摘录'));
    console.log('body has sample:', body.includes(sample));

    const hasMistake = flagsAfter.some(f => f.type === 'mistake');
    results.push(['flag written to IDB', hasMistake]);
    results.push(['UI shows 已摘录 or word', body.includes('已摘录') || body.includes(sample)]);

    // reload
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2500);
    const body2 = await page.textContent('body');
    results.push(['persist tag after reload', body2.includes('已摘录')]);

    // remove
    const removeBtn = await page.$('button:has-text("移除")');
    if (removeBtn) {
      await removeBtn.click();
      await page.waitForTimeout(1500);
      const flagsPost = await readFlags(page);
      console.log('flags post-remove:', JSON.stringify(flagsPost));
      results.push(['mistake flag deleted', !flagsPost.some(f => f.type === 'mistake')]);
    }

    await page.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2500);
    const body3 = await page.textContent('body');
    results.push(['gone after reload', !body3.includes('已摘录')]);

    // study
    await page.goto(`${BASE}/#/library`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1200);
    const studyBtn = await page.$('button:has-text("学习")');
    if (studyBtn) {
      await studyBtn.click();
      await page.waitForTimeout(2500);
      const b = await page.textContent('body');
      results.push(['study loads', b.includes('返回') || /\d+\s*\/\s*\d+/.test(b)]);

      const question = await page.$('.flash-question');
      if (question) {
        await question.click();
        await page.waitForTimeout(500);
        const gradeBtn = await page.$('button:has-text("不认识")');
        if (gradeBtn) {
          await gradeBtn.click();
          await page.waitForTimeout(1200);
          results.push(['study grade click does not throw', pageErrors.length === 0]);
        }
      }
    }
  } finally {
    await browser.close().catch(() => {});
  }

  let pass = 0, fail = 0;
  for (const [name, ok] of results) {
    console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}`);
    ok ? pass++ : fail++;
  }
  console.log(`\n${pass} pass, ${fail} fail`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
