// Synthetic dataset for the Company Leaderboard 2025 replica.
// All names, org codes, and activity titles are fictional placeholders.
// Generic role labels, the {+8, +16, +32, +64} point ladder, and the
// three category names ("Education", "Public Speaking", "University
// Partnership") are UI conventions copied from the screenshots — not
// corporate data.

const POINTS = { tiny: 8, small: 16, medium: 32, large: 64 };

const CATEGORIES = ['Education', 'Public Speaking', 'University Partnership'];

const ROLES = [
  'Software Engineer',
  'Senior Software Engineer',
  'Lead Software Engineer',
  'QA Engineer',
  'Senior QA Engineer',
  'Lead QA Engineer',
  'Group Manager',
  'HR Manager',
  'Product Designer',
  'DevOps Engineer',
  'Technical Writer',
];

const ORG_CODES = [
  'ZX.U1.D1.G1',
  'ZX.U1.D1.G2',
  'ZX.U1.D2.G1',
  'WW.U2.D3.T1',
  'WW.U2.D3.T2',
  'AB.HR.C2',
  'MX.U1.D1.G1.T1',
  'MX.U1.DQA2.T1',
  'PQ.U3.D1.G1',
  'PQ.U3.D2.T1',
  'KR.OPS.A1',
  'KR.DESIGN.B1',
];

// Activity title templates (fictional). Prefix conventions copied from UI:
//   [EDU] = internal education / brown bag / workshop / digest / talk
//   [REG] = registered external / regional event / conference
const ACTIVITY_TEMPLATES = {
  'Public Speaking': [
    '[EDU] Tech Talk: Streaming Pipelines',
    '[EDU] Brown Bag: Testing Strategies',
    '[EDU] Frontend Workshop',
    '[EDU] Lightning Talk: Distributed Systems',
    '[EDU] Pair Programming Demo',
    '[EDU] Mob Coding Session',
    '[EDU] Hack Hour Showcase',
    '[REG] Conference 2025: Keynote',
    '[REG] Regional DevDay Talk',
    '[REG] Industry Summit Lightning Talk',
    '[REG] QA Summit 2025',
    '[EDU] Friday Demo Day',
    '[EDU] Knowledge Share: Code Review',
    '[EDU] Engineering All-Hands Talk',
  ],
  'Education': [
    '[EDU] Mentor: Junior Onboarding Track',
    '[EDU] Mentor: Internship Program',
    '[EDU] 1:1 Mentoring Session',
    '[EDU] Career Coaching Session',
    '[EDU] Code Review Coaching',
    '[EDU] Pair Programming with New Hire',
    '[EDU] Mock Interview Coaching',
    '[EDU] Curriculum: Backend Bootcamp',
    '[EDU] Curriculum: Frontend Bootcamp',
    '[EDU] Curriculum: QA Fundamentals',
  ],
  'University Partnership': [
    '[REG] University Lecture: Software Design',
    '[REG] Campus Hackathon Mentor',
    '[REG] Career Fair Booth',
    '[REG] University Workshop: Testing Basics',
    '[REG] Capstone Project Reviewer',
    '[REG] Guest Speaker: Industry Trends',
    '[REG] University Open Day Lab',
  ],
};

function diceBearAvatar(seed) {
  return 'https://api.dicebear.com/7.x/notionists/svg?seed=' + encodeURIComponent(seed)
    + '&backgroundType=gradientLinear&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf';
}

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickPoints(rng) {
  const r = rng();
  if (r < 0.18) return POINTS.tiny;
  if (r < 0.55) return POINTS.small;
  if (r < 0.85) return POINTS.medium;
  return POINTS.large;
}

function pickFromArray(arr, rng) {
  return arr[Math.floor(rng() * arr.length)];
}

function formatDate(d) {
  return d.toISOString().slice(0, 10);
}
function yearOf(s) { return s.slice(0, 4); }

// 28 fictional employees. The 'mix' object distributes activities across
// the three real categories: ps = Public Speaking, ed = Education, up = University Partnership.
const EMPLOYEE_SEEDS = [
  { name: 'Hira Rodrigues', role: 'Software Engineer', code: 'PQ.U3.D1.G1', mix: { ps: 5, ed: 5, up: 0 }, seed: 2000 },
  { name: 'Viktor Anand', role: 'Software Engineer', code: 'ZX.U1.D2.G1', mix: { ps: 2, ed: 7, up: 1 }, seed: 2001 },
  { name: 'Manu Brennan', role: 'Lead QA Engineer', code: 'PQ.U3.D1.G1', mix: { ps: 3, ed: 3, up: 0 }, seed: 2002 },
  { name: 'Nia Lindqvist', role: 'Senior Software Engineer', code: 'ZX.U1.D1.G2', mix: { ps: 2, ed: 7, up: 1 }, seed: 2003 },
  { name: 'Niko Ferreira', role: 'Software Engineer', code: 'AB.HR.C2', mix: { ps: 5, ed: 2, up: 0 }, seed: 2004 },
  { name: 'Sky Sorensen', role: 'Senior Software Engineer', code: 'PQ.U3.D1.G1', mix: { ps: 1, ed: 1, up: 0 }, seed: 2005 },
  { name: 'Una Antonelli', role: 'Senior Software Engineer', code: 'MX.U1.D1.G1.T1', mix: { ps: 3, ed: 4, up: 0 }, seed: 2006 },
  { name: 'Ezra Anand', role: 'HR Manager', code: 'WW.U2.D3.T2', mix: { ps: 2, ed: 3, up: 0 }, seed: 2007 },
  { name: 'Ezra Ferreira', role: 'DevOps Engineer', code: 'KR.OPS.A1', mix: { ps: 4, ed: 2, up: 0 }, seed: 2008 },
  { name: 'Kael Okonkwo', role: 'Lead QA Engineer', code: 'WW.U2.D3.T1', mix: { ps: 10, ed: 5, up: 0 }, seed: 2009 },
  { name: 'Hira Osei', role: 'Software Engineer', code: 'ZX.U1.D1.G1', mix: { ps: 11, ed: 3, up: 0 }, seed: 2010 },
  { name: 'Ade Iyer', role: 'HR Manager', code: 'ZX.U1.D2.G1', mix: { ps: 8, ed: 5, up: 0 }, seed: 2011 },
  { name: 'Finn Russo', role: 'Senior Software Engineer', code: 'PQ.U3.D2.T1', mix: { ps: 1, ed: 11, up: 1 }, seed: 2012 },
  { name: 'Yuki Gupta', role: 'Lead Software Engineer', code: 'ZX.U1.D1.G2', mix: { ps: 5, ed: 3, up: 0 }, seed: 2013 },
  { name: 'Pita Russo', role: 'Software Engineer', code: 'WW.U2.D3.T2', mix: { ps: 2, ed: 10, up: 0 }, seed: 2014 },
  { name: 'Hana Weber', role: 'Product Designer', code: 'PQ.U3.D1.G1', mix: { ps: 2, ed: 5, up: 0 }, seed: 2015 },
  { name: 'Gael Voss', role: 'Technical Writer', code: 'PQ.U3.D1.G1', mix: { ps: 3, ed: 3, up: 0 }, seed: 2016 },
  { name: 'Xander Mueller', role: 'Senior Software Engineer', code: 'ZX.U1.D2.G1', mix: { ps: 1, ed: 4, up: 0 }, seed: 2017 },
  { name: 'Reed Sorensen', role: 'QA Engineer', code: 'ZX.U1.D1.G1', mix: { ps: 1, ed: 1, up: 0 }, seed: 2018 },
  { name: 'Zara Mensah', role: 'Technical Writer', code: 'WW.U2.D3.T1', mix: { ps: 0, ed: 1, up: 0 }, seed: 2019 },
  { name: 'Gia Vargas', role: 'Technical Writer', code: 'WW.U2.D3.T2', mix: { ps: 4, ed: 5, up: 0 }, seed: 2020 },
  { name: 'Ezra Fischer', role: 'Software Engineer', code: 'MX.U1.DQA2.T1', mix: { ps: 10, ed: 2, up: 0 }, seed: 2021 },
  { name: 'Cora Bernardi', role: 'Product Designer', code: 'ZX.U1.D1.G1', mix: { ps: 3, ed: 2, up: 0 }, seed: 2022 },
  { name: 'Bex Hassan', role: 'HR Manager', code: 'KR.DESIGN.B1', mix: { ps: 4, ed: 2, up: 0 }, seed: 2023 },
  { name: 'Aiko Sundermann', role: 'Senior QA Engineer', code: 'WW.U2.D3.T2', mix: { ps: 3, ed: 2, up: 0 }, seed: 2024 },
  { name: 'Alex Russo', role: 'Senior QA Engineer', code: 'KR.DESIGN.B1', mix: { ps: 4, ed: 2, up: 0 }, seed: 2025 },
  { name: 'Kael Maier', role: 'Senior QA Engineer', code: 'WW.U2.D3.T2', mix: { ps: 3, ed: 1, up: 0 }, seed: 2026 },
  { name: 'Una Bernardi', role: 'Technical Writer', code: 'MX.U1.DQA2.T1', mix: { ps: 4, ed: 3, up: 0 }, seed: 2027 },
  { name: 'Pita Silva', role: 'Lead Software Engineer', code: 'MX.U1.DQA2.T1', mix: { ps: 5, ed: 3, up: 0 }, seed: 2028 },
  { name: 'Luca Maier', role: 'QA Engineer', code: 'PQ.U3.D1.G1', mix: { ps: 11, ed: 5, up: 0 }, seed: 2029 },
  { name: 'Sofia Carvalho', role: 'QA Engineer', code: 'ZX.U1.D1.G2', mix: { ps: 13, ed: 7, up: 1 }, seed: 2030 },
  { name: 'Femi Nwosu', role: 'Lead QA Engineer', code: 'ZX.U1.D2.G1', mix: { ps: 6, ed: 4, up: 0 }, seed: 2031 },
  { name: 'Emil Dubois', role: 'HR Manager', code: 'MX.U1.DQA2.T1', mix: { ps: 0, ed: 11, up: 1 }, seed: 2032 },
  { name: 'Koa Kozlov', role: 'HR Manager', code: 'AB.HR.C2', mix: { ps: 1, ed: 2, up: 0 }, seed: 2033 },
  { name: 'Zara Marchetti', role: 'Software Engineer', code: 'KR.DESIGN.B1', mix: { ps: 8, ed: 3, up: 0 }, seed: 2034 },
  { name: 'Dani Kwon', role: 'Senior Software Engineer', code: 'ZX.U1.D2.G1', mix: { ps: 7, ed: 4, up: 0 }, seed: 2035 },
  { name: 'Viktor Mansour', role: 'DevOps Engineer', code: 'MX.U1.DQA2.T1', mix: { ps: 0, ed: 1, up: 0 }, seed: 2036 },
  { name: 'Idris Morales', role: 'Product Designer', code: 'ZX.U1.D1.G1', mix: { ps: 1, ed: 2, up: 0 }, seed: 2037 },
  { name: 'Leo Ortega', role: 'DevOps Engineer', code: 'MX.U1.D1.G1.T1', mix: { ps: 5, ed: 2, up: 0 }, seed: 2038 },
  { name: 'Tara Maier', role: 'Group Manager', code: 'MX.U1.DQA2.T1', mix: { ps: 2, ed: 3, up: 5 }, seed: 2039 },
  { name: 'Eve Khalil', role: 'Lead QA Engineer', code: 'WW.U2.D3.T2', mix: { ps: 1, ed: 11, up: 0 }, seed: 2040 },
  { name: 'Olga Andersen', role: 'Product Designer', code: 'WW.U2.D3.T1', mix: { ps: 5, ed: 4, up: 0 }, seed: 2041 },
  { name: 'Rin Suzuki', role: 'Software Engineer', code: 'PQ.U3.D1.G1', mix: { ps: 2, ed: 11, up: 0 }, seed: 2042 },
  { name: 'Priya Walsh', role: 'Software Engineer', code: 'ZX.U1.D2.G1', mix: { ps: 1, ed: 2, up: 4 }, seed: 2043 },
  { name: 'Ivy Sato', role: 'Group Manager', code: 'PQ.U3.D2.T1', mix: { ps: 2, ed: 4, up: 4 }, seed: 2044 },
  { name: 'Zoe Bernardi', role: 'Software Engineer', code: 'MX.U1.DQA2.T1', mix: { ps: 4, ed: 4, up: 0 }, seed: 2045 },
  { name: 'Viktor Lopes', role: 'Group Manager', code: 'PQ.U3.D2.T1', mix: { ps: 2, ed: 3, up: 0 }, seed: 2046 },
  { name: 'Una Russo', role: 'Software Engineer', code: 'PQ.U3.D1.G1', mix: { ps: 6, ed: 2, up: 0 }, seed: 2047 },
  { name: 'Alex Eriksson', role: 'Lead Software Engineer', code: 'ZX.U1.D1.G2', mix: { ps: 5, ed: 2, up: 0 }, seed: 2048 },
  { name: 'Tibo Johansson', role: 'QA Engineer', code: 'PQ.U3.D1.G1', mix: { ps: 2, ed: 9, up: 0 }, seed: 2049 },
  { name: 'Femi Petros', role: 'Lead Software Engineer', code: 'ZX.U1.D1.G1', mix: { ps: 0, ed: 2, up: 0 }, seed: 2050 },
  { name: 'Kira Adeyemi', role: 'Software Engineer', code: 'PQ.U3.D1.G1', mix: { ps: 1, ed: 2, up: 4 }, seed: 2051 },
  { name: 'Cleo Larsen', role: 'QA Engineer', code: 'PQ.U3.D1.G1', mix: { ps: 14, ed: 6, up: 1 }, seed: 2052 },
  { name: 'Dani Maier', role: 'Group Manager', code: 'WW.U2.D3.T2', mix: { ps: 1, ed: 2, up: 0 }, seed: 2053 },
  { name: 'Tara Mensah', role: 'Senior Software Engineer', code: 'ZX.U1.D1.G2', mix: { ps: 6, ed: 4, up: 0 }, seed: 2054 },
  { name: 'Umi Sato', role: 'Senior Software Engineer', code: 'ZX.U1.D2.G1', mix: { ps: 1, ed: 11, up: 1 }, seed: 2055 },
  { name: 'Gael Adesanya', role: 'Software Engineer', code: 'ZX.U1.D1.G2', mix: { ps: 2, ed: 1, up: 0 }, seed: 2056 },
  { name: 'Priya Vargas', role: 'QA Engineer', code: 'MX.U1.D1.G1.T1', mix: { ps: 3, ed: 3, up: 0 }, seed: 2057 },
  { name: 'Yuki Nwosu', role: 'HR Manager', code: 'MX.U1.D1.G1.T1', mix: { ps: 3, ed: 4, up: 0 }, seed: 2058 },
  { name: 'Mira Taniguchi', role: 'Technical Writer', code: 'ZX.U1.D1.G1', mix: { ps: 14, ed: 7, up: 1 }, seed: 2059 },
  { name: 'Manu Nkosi', role: 'Senior Software Engineer', code: 'PQ.U3.D2.T1', mix: { ps: 0, ed: 7, up: 0 }, seed: 2060 },
  { name: 'Sion Mueller', role: 'QA Engineer', code: 'ZX.U1.D2.G1', mix: { ps: 6, ed: 2, up: 0 }, seed: 2061 },
  { name: 'Isla Russo', role: 'Senior Software Engineer', code: 'WW.U2.D3.T1', mix: { ps: 1, ed: 10, up: 1 }, seed: 2062 },
  { name: 'Jude Reyes', role: 'QA Engineer', code: 'WW.U2.D3.T2', mix: { ps: 1, ed: 3, up: 0 }, seed: 2063 },
  { name: 'Quinn Adesanya', role: 'Senior QA Engineer', code: 'MX.U1.DQA2.T1', mix: { ps: 3, ed: 1, up: 0 }, seed: 2064 },
  { name: 'Cleo Okonkwo', role: 'DevOps Engineer', code: 'ZX.U1.D1.G1', mix: { ps: 2, ed: 1, up: 0 }, seed: 2065 },
  { name: 'Viktor Cohen', role: 'Senior Software Engineer', code: 'MX.U1.D1.G1.T1', mix: { ps: 0, ed: 11, up: 1 }, seed: 2066 },
  { name: 'Sky Voss', role: 'Senior Software Engineer', code: 'AB.HR.C2', mix: { ps: 3, ed: 3, up: 0 }, seed: 2067 },
  { name: 'Nia Petros', role: 'QA Engineer', code: 'ZX.U1.D1.G1', mix: { ps: 2, ed: 2, up: 0 }, seed: 2068 },
  { name: 'Jax Anand', role: 'QA Engineer', code: 'MX.U1.D1.G1.T1', mix: { ps: 6, ed: 4, up: 0 }, seed: 2069 },
  { name: 'Ade Khalil', role: 'Product Designer', code: 'MX.U1.DQA2.T1', mix: { ps: 14, ed: 6, up: 1 }, seed: 2070 },
  { name: 'Finn Carvalho', role: 'Software Engineer', code: 'KR.OPS.A1', mix: { ps: 2, ed: 1, up: 0 }, seed: 2071 },
  { name: 'Javi Fischer', role: 'HR Manager', code: 'KR.DESIGN.B1', mix: { ps: 1, ed: 1, up: 0 }, seed: 2072 },
  { name: 'Dara Carvalho', role: 'Senior Software Engineer', code: 'ZX.U1.D1.G1', mix: { ps: 0, ed: 9, up: 0 }, seed: 2073 },
  { name: 'Gia Park', role: 'HR Manager', code: 'PQ.U3.D1.G1', mix: { ps: 5, ed: 4, up: 0 }, seed: 2074 },
  { name: 'Glen Bianchi', role: 'QA Engineer', code: 'MX.U1.D1.G1.T1', mix: { ps: 3, ed: 3, up: 0 }, seed: 2075 },
  { name: 'Remy Marchetti', role: 'Lead QA Engineer', code: 'MX.U1.DQA2.T1', mix: { ps: 3, ed: 4, up: 0 }, seed: 2076 },
  { name: 'Nils Hu', role: 'Senior Software Engineer', code: 'ZX.U1.D1.G2', mix: { ps: 4, ed: 2, up: 0 }, seed: 2077 },
  { name: 'Chen Nielsen', role: 'Senior Software Engineer', code: 'PQ.U3.D2.T1', mix: { ps: 4, ed: 5, up: 0 }, seed: 2078 },
  { name: 'Jude Weber', role: 'Software Engineer', code: 'ZX.U1.D1.G1', mix: { ps: 5, ed: 4, up: 0 }, seed: 2079 },
  { name: 'Wren Volkov', role: 'Software Engineer', code: 'KR.OPS.A1', mix: { ps: 6, ed: 5, up: 0 }, seed: 2080 },
  { name: 'Bram Park', role: 'Software Engineer', code: 'ZX.U1.D1.G1', mix: { ps: 7, ed: 4, up: 0 }, seed: 2081 },
  { name: 'Dion Sundermann', role: 'Senior Software Engineer', code: 'ZX.U1.D2.G1', mix: { ps: 11, ed: 4, up: 0 }, seed: 2082 },
  { name: 'Rio Mansour', role: 'Software Engineer', code: 'ZX.U1.D2.G1', mix: { ps: 5, ed: 4, up: 0 }, seed: 2083 },
  { name: 'Asha Desai', role: 'Senior Software Engineer', code: 'ZX.U1.D1.G1', mix: { ps: 0, ed: 8, up: 1 }, seed: 2084 },
  { name: 'Lena Yamamoto', role: 'Senior Software Engineer', code: 'ZX.U1.D1.G1', mix: { ps: 3, ed: 4, up: 0 }, seed: 2085 },
  { name: 'Zoe Sorensen', role: 'Senior Software Engineer', code: 'PQ.U3.D2.T1', mix: { ps: 11, ed: 4, up: 0 }, seed: 2086 },
  { name: 'Yuki Ibarra', role: 'Software Engineer', code: 'MX.U1.D1.G1.T1', mix: { ps: 2, ed: 3, up: 0 }, seed: 2087 },
  { name: 'Dion Wanjiku', role: 'DevOps Engineer', code: 'MX.U1.DQA2.T1', mix: { ps: 2, ed: 4, up: 4 }, seed: 2088 },
  { name: 'Idris Fernandez', role: 'Product Designer', code: 'WW.U2.D3.T2', mix: { ps: 3, ed: 3, up: 0 }, seed: 2089 },
  { name: 'Felix Sato', role: 'Senior QA Engineer', code: 'ZX.U1.D2.G1', mix: { ps: 2, ed: 4, up: 0 }, seed: 2090 },
  { name: 'Jude Andersson', role: 'QA Engineer', code: 'PQ.U3.D2.T1', mix: { ps: 3, ed: 3, up: 0 }, seed: 2091 },
  { name: 'Niko Desai', role: 'Lead QA Engineer', code: 'KR.DESIGN.B1', mix: { ps: 1, ed: 9, up: 1 }, seed: 2092 },
  { name: 'Xander Gupta', role: 'DevOps Engineer', code: 'WW.U2.D3.T1', mix: { ps: 11, ed: 4, up: 0 }, seed: 2093 },
  { name: 'Yuki Bergqvist', role: 'Technical Writer', code: 'WW.U2.D3.T2', mix: { ps: 3, ed: 4, up: 0 }, seed: 2094 },
  { name: 'Cho Voss', role: 'DevOps Engineer', code: 'ZX.U1.D1.G1', mix: { ps: 1, ed: 3, up: 0 }, seed: 2095 },
  { name: 'Remy Chukwu', role: 'QA Engineer', code: 'ZX.U1.D1.G1', mix: { ps: 6, ed: 4, up: 0 }, seed: 2096 },
  { name: 'Rio Nielsen', role: 'Senior Software Engineer', code: 'PQ.U3.D1.G1', mix: { ps: 3, ed: 4, up: 0 }, seed: 2097 },
  { name: 'Zoe Yamada', role: 'HR Manager', code: 'PQ.U3.D1.G1', mix: { ps: 0, ed: 9, up: 0 }, seed: 2098 },
  { name: 'Kael Kwon', role: 'HR Manager', code: 'WW.U2.D3.T1', mix: { ps: 1, ed: 4, up: 3 }, seed: 2099 },
  { name: 'Lena Lin', role: 'QA Engineer', code: 'ZX.U1.D1.G1', mix: { ps: 1, ed: 3, up: 0 }, seed: 2100 },
  { name: 'Zara Okafor', role: 'Senior Software Engineer', code: 'MX.U1.D1.G1.T1', mix: { ps: 5, ed: 2, up: 0 }, seed: 2101 },
  { name: 'Bao Iyer', role: 'QA Engineer', code: 'MX.U1.D1.G1.T1', mix: { ps: 4, ed: 4, up: 0 }, seed: 2102 },
  { name: 'Jin Chukwu', role: 'Senior QA Engineer', code: 'ZX.U1.D1.G2', mix: { ps: 3, ed: 4, up: 0 }, seed: 2103 },
  { name: 'Dion Ferreira', role: 'Software Engineer', code: 'PQ.U3.D1.G1', mix: { ps: 8, ed: 5, up: 0 }, seed: 2104 },
  { name: 'Javi Salman', role: 'Product Designer', code: 'WW.U2.D3.T1', mix: { ps: 3, ed: 4, up: 0 }, seed: 2105 },
  { name: 'Bela Yamada', role: 'Software Engineer', code: 'WW.U2.D3.T2', mix: { ps: 3, ed: 1, up: 0 }, seed: 2106 },
  { name: 'Aleksei Volkov', role: 'Technical Writer', code: 'WW.U2.D3.T2', mix: { ps: 2, ed: 1, up: 0 }, seed: 2107 },
  { name: 'Dion Nwosu', role: 'Product Designer', code: 'PQ.U3.D1.G1', mix: { ps: 1, ed: 8, up: 0 }, seed: 2108 },
  { name: 'Manu Desai', role: 'Senior Software Engineer', code: 'WW.U2.D3.T2', mix: { ps: 2, ed: 2, up: 0 }, seed: 2109 },
  { name: 'Cleo Chukwu', role: 'Senior Software Engineer', code: 'ZX.U1.D1.G1', mix: { ps: 0, ed: 10, up: 1 }, seed: 2110 },
  { name: 'Gia Nkosi', role: 'DevOps Engineer', code: 'PQ.U3.D2.T1', mix: { ps: 3, ed: 3, up: 0 }, seed: 2111 },
  { name: 'Hira Mahmood', role: 'Software Engineer', code: 'MX.U1.DQA2.T1', mix: { ps: 4, ed: 1, up: 0 }, seed: 2112 },
  { name: 'Glen Gupta', role: 'Software Engineer', code: 'WW.U2.D3.T1', mix: { ps: 7, ed: 2, up: 0 }, seed: 2113 },
  { name: 'Glen Torres', role: 'Senior QA Engineer', code: 'ZX.U1.D2.G1', mix: { ps: 2, ed: 4, up: 0 }, seed: 2114 },
  { name: 'Ivo Dubois', role: 'QA Engineer', code: 'WW.U2.D3.T2', mix: { ps: 4, ed: 4, up: 0 }, seed: 2115 },
  { name: 'Tibo Morales', role: 'QA Engineer', code: 'MX.U1.D1.G1.T1', mix: { ps: 5, ed: 4, up: 0 }, seed: 2116 },
  { name: 'Cleo Eriksson', role: 'Senior Software Engineer', code: 'ZX.U1.D2.G1', mix: { ps: 11, ed: 4, up: 0 }, seed: 2117 },
  { name: 'Omar Sundermann', role: 'Software Engineer', code: 'PQ.U3.D2.T1', mix: { ps: 16, ed: 5, up: 0 }, seed: 2118 },
  { name: 'Noor Andersson', role: 'Lead QA Engineer', code: 'WW.U2.D3.T1', mix: { ps: 2, ed: 2, up: 0 }, seed: 2119 },
  { name: 'Ade Kozlov', role: 'Group Manager', code: 'MX.U1.D1.G1.T1', mix: { ps: 8, ed: 2, up: 0 }, seed: 2120 },
  { name: 'Olga Silva', role: 'Software Engineer', code: 'WW.U2.D3.T1', mix: { ps: 10, ed: 4, up: 0 }, seed: 2121 },
  { name: 'Koa Johansson', role: 'QA Engineer', code: 'ZX.U1.D1.G2', mix: { ps: 2, ed: 3, up: 0 }, seed: 2122 },
  { name: 'Yuki Olufemi', role: 'HR Manager', code: 'ZX.U1.D1.G1', mix: { ps: 2, ed: 4, up: 0 }, seed: 2123 },
  { name: 'Sami Vargas', role: 'Product Designer', code: 'WW.U2.D3.T2', mix: { ps: 6, ed: 2, up: 0 }, seed: 2124 },
  { name: 'Yuki Adesanya', role: 'Software Engineer', code: 'PQ.U3.D1.G1', mix: { ps: 1, ed: 7, up: 0 }, seed: 2125 },
  { name: 'Faye Cohen', role: 'Software Engineer', code: 'MX.U1.DQA2.T1', mix: { ps: 15, ed: 5, up: 1 }, seed: 2126 },
  { name: 'Gita Suzuki', role: 'Group Manager', code: 'PQ.U3.D2.T1', mix: { ps: 16, ed: 7, up: 0 }, seed: 2127 },
  { name: 'Yuki Ortega', role: 'DevOps Engineer', code: 'ZX.U1.D1.G1', mix: { ps: 8, ed: 5, up: 0 }, seed: 2128 },
  { name: 'Ivy Johansson', role: 'DevOps Engineer', code: 'PQ.U3.D1.G1', mix: { ps: 8, ed: 2, up: 0 }, seed: 2129 },
  { name: 'Maya Fernandez', role: 'HR Manager', code: 'ZX.U1.D1.G1', mix: { ps: 10, ed: 3, up: 0 }, seed: 2130 },
  { name: 'Remy Santos', role: 'Senior Software Engineer', code: 'MX.U1.D1.G1.T1', mix: { ps: 3, ed: 3, up: 0 }, seed: 2131 },
  { name: 'Val Brennan', role: 'Software Engineer', code: 'ZX.U1.D1.G1', mix: { ps: 1, ed: 3, up: 0 }, seed: 2132 },
  { name: 'Hale Voss', role: 'Lead QA Engineer', code: 'KR.DESIGN.B1', mix: { ps: 3, ed: 4, up: 0 }, seed: 2133 },
  { name: 'Hira Johansson', role: 'Software Engineer', code: 'MX.U1.DQA2.T1', mix: { ps: 9, ed: 4, up: 0 }, seed: 2134 },
  { name: 'Theo Bernardi', role: 'Lead QA Engineer', code: 'PQ.U3.D2.T1', mix: { ps: 0, ed: 1, up: 0 }, seed: 2135 },
  { name: 'Alex Nwosu', role: 'Software Engineer', code: 'PQ.U3.D1.G1', mix: { ps: 16, ed: 6, up: 1 }, seed: 2136 },
  { name: 'Ivy Lin', role: 'QA Engineer', code: 'PQ.U3.D2.T1', mix: { ps: 5, ed: 5, up: 0 }, seed: 2137 },
  { name: 'Lena Gupta', role: 'Software Engineer', code: 'MX.U1.DQA2.T1', mix: { ps: 1, ed: 3, up: 0 }, seed: 2138 },
  { name: 'Priya Salman', role: 'Senior QA Engineer', code: 'ZX.U1.D2.G1', mix: { ps: 6, ed: 4, up: 0 }, seed: 2139 },
  { name: 'Wren Andersson', role: 'Software Engineer', code: 'WW.U2.D3.T1', mix: { ps: 0, ed: 9, up: 1 }, seed: 2140 },
  { name: 'Yara Desai', role: 'Senior QA Engineer', code: 'ZX.U1.D1.G2', mix: { ps: 6, ed: 2, up: 0 }, seed: 2141 },
  { name: 'Gray Nakashima', role: 'Group Manager', code: 'ZX.U1.D1.G1', mix: { ps: 1, ed: 2, up: 0 }, seed: 2142 },
  { name: 'Sky Suzuki', role: 'Group Manager', code: 'PQ.U3.D1.G1', mix: { ps: 12, ed: 4, up: 1 }, seed: 2143 },
  { name: 'Faye Hansen', role: 'DevOps Engineer', code: 'AB.HR.C2', mix: { ps: 1, ed: 8, up: 0 }, seed: 2144 },
  { name: 'Rin Papadopoulos', role: 'Software Engineer', code: 'ZX.U1.D1.G1', mix: { ps: 6, ed: 3, up: 0 }, seed: 2145 },
  { name: 'Bao Kwon', role: 'Software Engineer', code: 'WW.U2.D3.T2', mix: { ps: 2, ed: 4, up: 0 }, seed: 2146 },
  { name: 'Noor Anand', role: 'Software Engineer', code: 'PQ.U3.D2.T1', mix: { ps: 1, ed: 3, up: 0 }, seed: 2147 },
  { name: 'Ivy Russo', role: 'Group Manager', code: 'MX.U1.D1.G1.T1', mix: { ps: 11, ed: 5, up: 0 }, seed: 2148 },
  { name: 'Kael Zhao', role: 'Lead Software Engineer', code: 'KR.DESIGN.B1', mix: { ps: 3, ed: 2, up: 0 }, seed: 2149 },
  { name: 'Rin Bianchi', role: 'Lead Software Engineer', code: 'ZX.U1.D1.G2', mix: { ps: 2, ed: 10, up: 0 }, seed: 2150 },
  { name: 'Max Nielsen', role: 'QA Engineer', code: 'PQ.U3.D1.G1', mix: { ps: 2, ed: 9, up: 0 }, seed: 2151 },
  { name: 'Cam Russo', role: 'QA Engineer', code: 'ZX.U1.D2.G1', mix: { ps: 3, ed: 1, up: 0 }, seed: 2152 },
  { name: 'Pax Kowalski', role: 'Software Engineer', code: 'MX.U1.D1.G1.T1', mix: { ps: 2, ed: 4, up: 0 }, seed: 2153 },
  { name: 'Omar Torres', role: 'Software Engineer', code: 'PQ.U3.D1.G1', mix: { ps: 1, ed: 8, up: 0 }, seed: 2154 },
  { name: 'Tibo Voss', role: 'Software Engineer', code: 'KR.DESIGN.B1', mix: { ps: 1, ed: 10, up: 1 }, seed: 2155 },
  { name: 'Jude Morales', role: 'Software Engineer', code: 'ZX.U1.D1.G1', mix: { ps: 0, ed: 8, up: 1 }, seed: 2156 },
  { name: 'Emil Larsen', role: 'HR Manager', code: 'ZX.U1.D2.G1', mix: { ps: 6, ed: 3, up: 0 }, seed: 2157 },
  { name: 'Isla Yamamoto', role: 'Group Manager', code: 'ZX.U1.D2.G1', mix: { ps: 6, ed: 5, up: 0 }, seed: 2158 },
  { name: 'Emil Bianchi', role: 'Software Engineer', code: 'KR.DESIGN.B1', mix: { ps: 1, ed: 11, up: 1 }, seed: 2159 },
  { name: 'Finn Yamada', role: 'DevOps Engineer', code: 'PQ.U3.D1.G1', mix: { ps: 0, ed: 8, up: 0 }, seed: 2160 },
  { name: 'Sky Maier', role: 'Group Manager', code: 'WW.U2.D3.T2', mix: { ps: 6, ed: 4, up: 0 }, seed: 2161 },
  { name: 'Tara Fischer', role: 'DevOps Engineer', code: 'ZX.U1.D2.G1', mix: { ps: 3, ed: 2, up: 0 }, seed: 2162 },
  { name: 'Una Patel', role: 'Software Engineer', code: 'MX.U1.DQA2.T1', mix: { ps: 5, ed: 5, up: 0 }, seed: 2163 },
  { name: 'Val Silva', role: 'Group Manager', code: 'ZX.U1.D1.G2', mix: { ps: 3, ed: 3, up: 0 }, seed: 2164 },
  { name: 'Glen Mensah', role: 'Group Manager', code: 'WW.U2.D3.T1', mix: { ps: 2, ed: 1, up: 0 }, seed: 2165 },
  { name: 'Prue Carvalho', role: 'Product Designer', code: 'PQ.U3.D1.G1', mix: { ps: 2, ed: 11, up: 1 }, seed: 2166 },
  { name: 'Lena Cohen', role: 'Lead Software Engineer', code: 'PQ.U3.D1.G1', mix: { ps: 0, ed: 7, up: 1 }, seed: 2167 },
  { name: 'Felix Suzuki', role: 'Product Designer', code: 'MX.U1.DQA2.T1', mix: { ps: 2, ed: 3, up: 0 }, seed: 2168 },
  { name: 'Gita Maier', role: 'Senior Software Engineer', code: 'ZX.U1.D2.G1', mix: { ps: 2, ed: 7, up: 0 }, seed: 2169 },
  { name: 'Cho Cohen', role: 'Software Engineer', code: 'PQ.U3.D1.G1', mix: { ps: 2, ed: 2, up: 0 }, seed: 2170 },
  { name: 'Fox Okafor', role: 'Software Engineer', code: 'WW.U2.D3.T1', mix: { ps: 16, ed: 7, up: 0 }, seed: 2171 },
  { name: 'Glen Zhao', role: 'Technical Writer', code: 'MX.U1.D1.G1.T1', mix: { ps: 6, ed: 3, up: 0 }, seed: 2172 },
  { name: 'Jude Johansson', role: 'QA Engineer', code: 'ZX.U1.D1.G1', mix: { ps: 1, ed: 2, up: 0 }, seed: 2173 },
  { name: 'Sera Silva', role: 'Technical Writer', code: 'MX.U1.DQA2.T1', mix: { ps: 7, ed: 4, up: 0 }, seed: 2174 },
  { name: 'Bo Lin', role: 'DevOps Engineer', code: 'ZX.U1.D1.G2', mix: { ps: 3, ed: 4, up: 0 }, seed: 2175 },
  { name: 'Ivo Silva', role: 'QA Engineer', code: 'ZX.U1.D1.G1', mix: { ps: 2, ed: 4, up: 3 }, seed: 2176 },
  { name: 'Hira Tanaka', role: 'QA Engineer', code: 'ZX.U1.D1.G1', mix: { ps: 14, ed: 4, up: 0 }, seed: 2177 },
  { name: 'Quinn Papadopoulos', role: 'HR Manager', code: 'WW.U2.D3.T1', mix: { ps: 0, ed: 3, up: 0 }, seed: 2178 },
  { name: 'Jin Fischer', role: 'Software Engineer', code: 'ZX.U1.D1.G2', mix: { ps: 2, ed: 8, up: 0 }, seed: 2179 },
  { name: 'Theo Eriksson', role: 'Group Manager', code: 'ZX.U1.D1.G2', mix: { ps: 0, ed: 2, up: 0 }, seed: 2180 },
  { name: 'Omar Salman', role: 'Software Engineer', code: 'ZX.U1.D1.G2', mix: { ps: 2, ed: 9, up: 0 }, seed: 2181 },
  { name: 'Hope Bernardi', role: 'Lead Software Engineer', code: 'ZX.U1.D1.G2', mix: { ps: 0, ed: 8, up: 0 }, seed: 2182 },
  { name: 'Cora Weber', role: 'Senior Software Engineer', code: 'ZX.U1.D1.G1', mix: { ps: 1, ed: 2, up: 0 }, seed: 2183 },
  { name: 'Cleo Lindqvist', role: 'Lead Software Engineer', code: 'MX.U1.DQA2.T1', mix: { ps: 3, ed: 2, up: 0 }, seed: 2184 },
  { name: 'Sion Suzuki', role: 'HR Manager', code: 'ZX.U1.D1.G2', mix: { ps: 6, ed: 2, up: 0 }, seed: 2185 },
  { name: 'Zoe Olufemi', role: 'Senior Software Engineer', code: 'ZX.U1.D2.G1', mix: { ps: 0, ed: 1, up: 0 }, seed: 2186 },
  { name: 'Tibo Weber', role: 'Senior Software Engineer', code: 'KR.DESIGN.B1', mix: { ps: 12, ed: 6, up: 0 }, seed: 2187 },
  { name: 'Bela Adesanya', role: 'Technical Writer', code: 'PQ.U3.D1.G1', mix: { ps: 9, ed: 3, up: 0 }, seed: 2188 },
  { name: 'Ezra Mahmood', role: 'Software Engineer', code: 'ZX.U1.D1.G1', mix: { ps: 2, ed: 4, up: 0 }, seed: 2189 },
  { name: 'Sion Brennan', role: 'DevOps Engineer', code: 'AB.HR.C2', mix: { ps: 2, ed: 5, up: 0 }, seed: 2190 },
  { name: 'Val Eriksson', role: 'Software Engineer', code: 'ZX.U1.D2.G1', mix: { ps: 5, ed: 4, up: 0 }, seed: 2191 },
  { name: 'Aleksei Desai', role: 'Product Designer', code: 'PQ.U3.D2.T1', mix: { ps: 10, ed: 4, up: 0 }, seed: 2192 },
  { name: 'Zara Nielsen', role: 'Software Engineer', code: 'ZX.U1.D1.G1', mix: { ps: 3, ed: 3, up: 0 }, seed: 2193 },
  { name: 'Vera Ndiaye', role: 'Software Engineer', code: 'ZX.U1.D1.G1', mix: { ps: 5, ed: 3, up: 0 }, seed: 2194 },
  { name: 'Zara Desai', role: 'QA Engineer', code: 'ZX.U1.D2.G1', mix: { ps: 0, ed: 7, up: 1 }, seed: 2195 },
  { name: 'Ivo Ramos', role: 'Senior QA Engineer', code: 'WW.U2.D3.T1', mix: { ps: 3, ed: 5, up: 0 }, seed: 2196 },
  { name: 'Javi Ibarra', role: 'Group Manager', code: 'WW.U2.D3.T1', mix: { ps: 2, ed: 2, up: 5 }, seed: 2197 },
  { name: 'Kael Fischer', role: 'Senior Software Engineer', code: 'MX.U1.D1.G1.T1', mix: { ps: 3, ed: 4, up: 0 }, seed: 2198 },
  { name: 'Liam Lin', role: 'Software Engineer', code: 'ZX.U1.D1.G1', mix: { ps: 3, ed: 4, up: 0 }, seed: 2199 },
  { name: 'Sion Salman', role: 'HR Manager', code: 'WW.U2.D3.T1', mix: { ps: 5, ed: 5, up: 0 }, seed: 2200 },
  { name: 'Javi Taniguchi', role: 'Senior Software Engineer', code: 'MX.U1.D1.G1.T1', mix: { ps: 2, ed: 9, up: 0 }, seed: 2201 },
  { name: 'Yara Carvalho', role: 'Senior Software Engineer', code: 'PQ.U3.D1.G1', mix: { ps: 4, ed: 4, up: 0 }, seed: 2202 },
  { name: 'Nils Ndiaye', role: 'Software Engineer', code: 'ZX.U1.D2.G1', mix: { ps: 16, ed: 5, up: 0 }, seed: 2203 },
  { name: 'Dani Nwosu', role: 'QA Engineer', code: 'ZX.U1.D1.G2', mix: { ps: 7, ed: 5, up: 0 }, seed: 2204 },
  { name: 'Leo Voss', role: 'Software Engineer', code: 'WW.U2.D3.T2', mix: { ps: 0, ed: 3, up: 0 }, seed: 2205 },
  { name: 'Sky Mueller', role: 'QA Engineer', code: 'ZX.U1.D1.G1', mix: { ps: 1, ed: 3, up: 0 }, seed: 2206 },
  { name: 'Gael Antonelli', role: 'Product Designer', code: 'ZX.U1.D1.G1', mix: { ps: 1, ed: 10, up: 1 }, seed: 2207 },
  { name: 'Remy Brennan', role: 'Lead Software Engineer', code: 'ZX.U1.D1.G1', mix: { ps: 11, ed: 5, up: 0 }, seed: 2208 },
  { name: 'Leo Maier', role: 'QA Engineer', code: 'ZX.U1.D2.G1', mix: { ps: 0, ed: 2, up: 4 }, seed: 2209 },
  { name: 'Hope Yamamoto', role: 'DevOps Engineer', code: 'ZX.U1.D1.G2', mix: { ps: 2, ed: 5, up: 0 }, seed: 2210 },
  { name: 'Jin Diaz', role: 'Senior Software Engineer', code: 'MX.U1.DQA2.T1', mix: { ps: 2, ed: 2, up: 0 }, seed: 2211 },
  { name: 'Drew Taniguchi', role: 'QA Engineer', code: 'MX.U1.D1.G1.T1', mix: { ps: 3, ed: 1, up: 0 }, seed: 2212 },
  { name: 'Finn Walsh', role: 'Technical Writer', code: 'KR.DESIGN.B1', mix: { ps: 3, ed: 4, up: 0 }, seed: 2213 },
  { name: 'Bex Yamada', role: 'Senior Software Engineer', code: 'WW.U2.D3.T1', mix: { ps: 1, ed: 9, up: 1 }, seed: 2214 },
  { name: 'Eden Antonelli', role: 'HR Manager', code: 'ZX.U1.D1.G1', mix: { ps: 2, ed: 10, up: 1 }, seed: 2215 },
  { name: 'Olga Torres', role: 'DevOps Engineer', code: 'WW.U2.D3.T1', mix: { ps: 1, ed: 3, up: 0 }, seed: 2216 },
  { name: 'Wren Torres', role: 'Senior Software Engineer', code: 'MX.U1.DQA2.T1', mix: { ps: 4, ed: 3, up: 0 }, seed: 2217 },
  { name: 'Tara Zhao', role: 'Software Engineer', code: 'KR.OPS.A1', mix: { ps: 11, ed: 4, up: 0 }, seed: 2218 },
  { name: 'Remy Nielsen', role: 'Senior QA Engineer', code: 'PQ.U3.D2.T1', mix: { ps: 0, ed: 11, up: 1 }, seed: 2219 },
  { name: 'Remy Andersen', role: 'QA Engineer', code: 'ZX.U1.D2.G1', mix: { ps: 11, ed: 4, up: 0 }, seed: 2220 },
  { name: 'Aiko Tanaka', role: 'Software Engineer', code: 'ZX.U1.D2.G1', mix: { ps: 2, ed: 1, up: 0 }, seed: 2221 },
  { name: 'Cora Patel', role: 'Product Designer', code: 'MX.U1.DQA2.T1', mix: { ps: 1, ed: 2, up: 0 }, seed: 2222 },
  { name: 'Leo Adeyemi', role: 'Software Engineer', code: 'PQ.U3.D1.G1', mix: { ps: 0, ed: 8, up: 1 }, seed: 2223 },
  { name: 'Finn Chukwu', role: 'Senior Software Engineer', code: 'WW.U2.D3.T2', mix: { ps: 9, ed: 5, up: 0 }, seed: 2224 },
  { name: 'Sion Sundermann', role: 'Lead QA Engineer', code: 'ZX.U1.D1.G1', mix: { ps: 3, ed: 3, up: 0 }, seed: 2225 },
  { name: 'Reed Lopes', role: 'Product Designer', code: 'WW.U2.D3.T2', mix: { ps: 9, ed: 4, up: 0 }, seed: 2226 },
];

function buildActivities(emp) {
  const rng = mulberry32(emp.seed);
  const activities = [];
  const startDates = [
    new Date('2025-01-15'), new Date('2025-02-01'),
    new Date('2025-03-01'), new Date('2025-05-01'),
    new Date('2025-07-01'), new Date('2025-09-01'),
    new Date('2025-10-01'), new Date('2025-11-01'),
    new Date('2025-12-01'),  // max jitter 24 days → Dec 25 at most
  ];
  function makeActivities(category, count) {
    const templates = ACTIVITY_TEMPLATES[category];
    for (let i = 0; i < count; i++) {
      const baseDate = startDates[Math.floor(rng() * startDates.length)];
      const jitter = Math.floor(rng() * 25);
      const d = new Date(baseDate.getTime() + jitter * 24 * 60 * 60 * 1000);
      const title = pickFromArray(templates, rng);
      const suffix = ' #' + (Math.floor(rng() * 20) + 1);
      activities.push({
        title: title + suffix,
        category,
        date: formatDate(d),
        points: pickPoints(rng),
      });
    }
  }
  makeActivities('Public Speaking',       emp.mix.ps);
  makeActivities('Education',             emp.mix.ed);
  makeActivities('University Partnership', emp.mix.up);
  activities.sort((a, b) => (a.date < b.date ? 1 : -1));
  return activities;
}

const EMPLOYEES = EMPLOYEE_SEEDS.map((emp, idx) => {
  const id = 'e' + String(idx + 1).padStart(2, '0');
  return {
    id,
    name: emp.name,
    role: emp.role,
    code: emp.code,
    avatar: './assets/avatars/' + id + '.svg',
    activities: buildActivities(emp),
  };
});

const YEARS = Array.from(new Set(
  EMPLOYEES.flatMap(e => e.activities.map(a => yearOf(a.date)))
)).sort().reverse();

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

window.LEADERBOARD_DATA = { EMPLOYEES, YEARS, QUARTERS, CATEGORIES };
