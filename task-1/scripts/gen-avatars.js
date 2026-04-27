// scripts/gen-avatars.js
// Downloads all employee avatars from DiceBear and stores them locally so the
// page never hits API rate limits when loading 227 images simultaneously.
//
// Run once (requires internet):  node task-1/scripts/gen-avatars.js
// Output:  task-1/assets/avatars/e01.svg ... e227.svg
//
// Safe to re-run - already-downloaded files are skipped.

'use strict';

const https  = require('https');
const fs     = require('fs');
const path   = require('path');

const OUT_DIR   = path.resolve(__dirname, '../assets/avatars');
const DATA_PATH = path.resolve(__dirname, '../data.js');

// Extract employee list by parsing EMPLOYEE_SEEDS from data.js (no eval needed)
function loadEmployees() {
  const src = fs.readFileSync(DATA_PATH, 'utf8');
  const re = /\{\s*name:\s*'([^']+)'[\s\S]*?seed:\s*(\d+)\s*\}/g;
  const employees = [];
  let m;
  while ((m = re.exec(src)) !== null) {
    const idx = employees.length + 1;
    employees.push({
      id:   'e' + String(idx).padStart(2, '0'),
      name: m[1],
    });
  }
  return employees;
}

// DiceBear URL - same parameters as data.js
function avatarUrl(name) {
  return (
    'https://api.dicebear.com/7.x/notionists/svg?seed=' +
    encodeURIComponent(name) +
    '&backgroundType=gradientLinear&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf'
  );
}

// HTTPS GET with one redirect follow
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'gen-avatars/1.0' } }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          return fetchUrl(res.headers.location).then(resolve).catch(reject);
        }
        if (res.statusCode !== 200) {
          return reject(new Error('HTTP ' + res.statusCode));
        }
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => resolve(body));
      })
      .on('error', reject);
  });
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function main() {
  const employees = loadEmployees();
  console.log('Found ' + employees.length + ' employees in data.js');

  fs.mkdirSync(OUT_DIR, { recursive: true });

  let downloaded = 0, skipped = 0, errors = 0;

  for (let i = 0; i < employees.length; i++) {
    const emp     = employees[i];
    const file    = emp.id + '.svg';
    const outPath = path.join(OUT_DIR, file);

    if (fs.existsSync(outPath)) {
      process.stdout.write('  skip   [' + (i+1) + '/' + employees.length + '] ' + file + '\n');
      skipped++;
      continue;
    }

    try {
      const svg = await fetchUrl(avatarUrl(emp.name));
      fs.writeFileSync(outPath, svg, 'utf8');
      process.stdout.write('  saved  [' + (i+1) + '/' + employees.length + '] ' + file + '  (' + emp.name + ')\n');
      downloaded++;
    } catch (err) {
      process.stdout.write('  ERROR  [' + (i+1) + '/' + employees.length + '] ' + file + ': ' + err.message + '\n');
      errors++;
    }

    await sleep(80);
  }

  console.log('\nDone.  downloaded: ' + downloaded + '  skipped: ' + skipped + '  errors: ' + errors);
  console.log('Avatars saved to: ' + OUT_DIR);
}

main().catch((err) => { console.error('Fatal:', err); process.exit(1); });
