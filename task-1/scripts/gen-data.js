// scripts/gen-data.js
// Generates 227 synthetic employees and patches them into data.js.
// Usage:  node task-1/scripts/gen-data.js
//
// The script is intentionally kept alongside the source so the generation
// workflow can be reproduced and documented in report.md.

'use strict';

const fs   = require('fs');
const path = require('path');

// ── Mulberry32 PRNG (same algorithm used at runtime in data.js) ───────────────
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function randInt(rng, lo, hi) { return lo + Math.floor(rng() * (hi - lo + 1)); }
function pick(rng, arr)       { return arr[Math.floor(rng() * arr.length)]; }

// ── Name pools ───────────────────────────────────────────────────────────────
// 98 first names × 85 last names = 8 330 unique combinations; we take 227.
const FIRST = [
  'Aria','Bo','Chen','Dara','Elara','Felix','Gita','Hana','Ivo','Jin',
  'Kira','Liam','Maya','Niko','Omar','Priya','Quinn','Rin','Sami','Tara',
  'Una','Viktor','Wendy','Xander','Yara','Zara','Aleksei','Sofia','Alex','Bao',
  'Cleo','Dani','Emil','Femi','Gael','Hira','Ines','Jude','Kai','Lena',
  'Manu','Noor','Olga','Pita','Remy','Sion','Theo','Umi','Vera','Wren',
  'Aiko','Bram','Cora','Dion','Ezra','Faye','Glen','Hale','Isla','Javi',
  'Kael','Luca','Mira','Nils','Prue','Reed','Sera','Tibo','Umar',
  'Yuki','Asha','Bela','Cam','Dex','Eve','Fox','Gia','Hal','Ivy',
  'Jax','Koa','Leo','Max','Nia','Pax','Rio','Sky','Val',
  'Zoe','Ade','Bex','Cho','Drew','Eden','Finn','Gray','Hope','Idris',
];

const LAST = [
  'Sundermann','Marchetti','Lin','Olufemi','Voss','Tanaka','Iyer','Yamamoto',
  'Petros','Hu','Salman','Larsen','Cohen','Bernardi','Khalil','Desai',
  'Walsh','Sato','Andersson','Mahmood','Carvalho','Novak','Park','Reyes',
  'Mansour','Antonelli','Volkov','Ibarra','Santos','Kim','Patel','Mueller',
  'Diaz','Okafor','Johansson','Hassan','Nakamura','Torres','Schmidt',
  'Osei','Ferreira','Lindqvist','Bakr','Suzuki','Morales','Weber','Nkosi',
  'Vargas','Anand','Kowalski','Silva','Okonkwo','Hansen','Dubois',
  'Yamada','Ramos','Eriksson','Mensah','Bianchi','Andersen','Adeyemi','Fischer',
  'Russo','Brennan','Ndiaye','Gupta','Zhao','Papadopoulos','Ortega','Nielsen',
  'Rodrigues','Kwon','Nakashima','Oduya','Fernandez','Bergqvist','Adesanya',
  'Chukwu','Kozlov','Maier','Nwosu','Sorensen','Taniguchi','Wanjiku','Lopes',
];

// ── Role + org-code pools (weighted) ─────────────────────────────────────────
const ROLES = [
  'Software Engineer',        'Software Engineer',        'Software Engineer',
  'Senior Software Engineer', 'Senior Software Engineer',
  'Lead Software Engineer',
  'QA Engineer',              'QA Engineer',
  'Senior QA Engineer',
  'Lead QA Engineer',
  'Group Manager',
  'HR Manager',
  'Product Designer',
  'DevOps Engineer',
  'Technical Writer',
];

const ORG_CODES = [
  'ZX.U1.D1.G1', 'ZX.U1.D1.G1', 'ZX.U1.D1.G1',
  'ZX.U1.D1.G2', 'ZX.U1.D1.G2',
  'ZX.U1.D2.G1', 'ZX.U1.D2.G1',
  'WW.U2.D3.T1', 'WW.U2.D3.T1',
  'WW.U2.D3.T2',
  'AB.HR.C2',
  'MX.U1.D1.G1.T1', 'MX.U1.D1.G1.T1',
  'MX.U1.DQA2.T1',  'MX.U1.DQA2.T1',
  'PQ.U3.D1.G1',    'PQ.U3.D1.G1',
  'PQ.U3.D2.T1',
  'KR.OPS.A1',
  'KR.DESIGN.B1',
];

// ── Activity-mix profiles ─────────────────────────────────────────────────────
// Columns: [ps_lo, ps_hi, ed_lo, ed_hi, up_lo, up_hi, weight]
// University Partnership (UP) is intentionally rare:
//   only UP-champion and a fraction of speaker/educator profiles carry it.
const PROFILES = [
  [12, 16,  4,  7, 0, 1,  5],  // star speaker   – very rare UP
  [ 6, 11,  2,  5, 0, 0, 15],  // active speaker  – no UP
  [ 0,  2,  7, 11, 0, 1, 20],  // educator        – rare UP
  [ 0,  2,  2,  5, 3, 5,  5],  // UP champion
  [ 2,  6,  2,  5, 0, 0, 25],  // balanced        – no UP
  [ 1,  4,  1,  4, 0, 0, 20],  // moderate        – no UP
  [ 0,  2,  1,  3, 0, 0, 10],  // light           – no UP
];

// ── Generate employees ────────────────────────────────────────────────────────
const rng = mulberry32(2025);          // fixed seed → reproducible output

// 1. All name combinations, shuffled deterministically
const allNames = [];
for (const f of FIRST)
  for (const l of LAST)
    allNames.push(`${f} ${l}`);

for (let i = allNames.length - 1; i > 0; i--) {
  const j = Math.floor(rng() * (i + 1));
  [allNames[i], allNames[j]] = [allNames[j], allNames[i]];
}

// 2. Weighted profile lookup array
const weighted = [];
for (const p of PROFILES)
  for (let i = 0; i < p[6]; i++) weighted.push(p);

// 3. Build 227 employee-seed objects
const seeds = [];
for (let i = 0; i < 227; i++) {
  const p = pick(rng, weighted);
  seeds.push({
    name: allNames[i],
    role: pick(rng, ROLES),
    code: pick(rng, ORG_CODES),
    mix:  { ps: randInt(rng, p[0], p[1]),
            ed: randInt(rng, p[2], p[3]),
            up: randInt(rng, p[4], p[5]) },
    seed: 2000 + i,
  });
}

// Diagnostic
const withUP = seeds.filter(e => e.mix.up > 0).length;
console.log(
  `Generated ${seeds.length} employees.  ` +
  `With UP activities: ${withUP} (${Math.round(withUP / seeds.length * 100)}%)`
);

// ── Patch data.js ────────────────────────────────────────────────────────────
const dataPath = path.resolve(__dirname, '../data.js');
const src = fs.readFileSync(dataPath, 'utf8');

const seedLines = seeds.map(e =>
  `  { name: '${e.name}', role: '${e.role}', code: '${e.code}', ` +
  `mix: { ps: ${e.mix.ps}, ed: ${e.mix.ed}, up: ${e.mix.up} }, seed: ${e.seed} },`
).join('\n');

// Replace the entire EMPLOYEE_SEEDS = [ ... ]; block (non-greedy, dotAll)
const updated = src.replace(
  /const EMPLOYEE_SEEDS = \[[\s\S]*?\n\];/,
  `const EMPLOYEE_SEEDS = [\n${seedLines}\n];`
);

if (updated === src) {
  console.error('ERROR: EMPLOYEE_SEEDS block not found in data.js — nothing written.');
  process.exit(1);
}

fs.writeFileSync(dataPath, updated, 'utf8');
console.log(`✓  Patched data.js`);
