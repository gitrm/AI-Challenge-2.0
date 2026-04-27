// Company Leaderboard 2025 — interactivity (filter, search, sort, expand).
// Renders against window.LEADERBOARD_DATA from data.js.

(function () {
  const { EMPLOYEES, YEARS, QUARTERS, CATEGORIES } = window.LEADERBOARD_DATA;

  const state = {
    year: '',
    quarter: '',
    category: '',
    query: '',
    expanded: new Set(),
  };

  // ----- Date formatting (DD-Mon-YYYY) -----
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  function formatPretty(yyyy_mm_dd) {
    const [y, m, d] = yyyy_mm_dd.split('-');
    return d + '-' + MONTHS[parseInt(m, 10) - 1] + '-' + y;
  }
  function quarterOf(yyyy_mm_dd) {
    return 'Q' + Math.ceil(parseInt(yyyy_mm_dd.slice(5, 7), 10) / 3);
  }
  function yearOf(yyyy_mm_dd) {
    return yyyy_mm_dd.slice(0, 4);
  }

  // ----- Filter + ranking -----
  function activityMatchesFilters(a) {
    if (state.year && yearOf(a.date) !== state.year) return false;
    if (state.quarter && quarterOf(a.date) !== state.quarter) return false;
    if (state.category && a.category !== state.category) return false;
    return true;
  }

  function computeView() {
    const q = state.query.trim().toLowerCase();
    const rows = EMPLOYEES
      .map((emp) => {
        const filtered = emp.activities.filter(activityMatchesFilters);
        const total = filtered.reduce((acc, a) => acc + a.points, 0);
        const counts = {
          'Public Speaking':       filtered.filter((a) => a.category === 'Public Speaking').length,
          'Education':             filtered.filter((a) => a.category === 'Education').length,
          'University Partnership':filtered.filter((a) => a.category === 'University Partnership').length,
        };
        return { emp, total, filtered, counts };
      })
      .filter((r) => r.total > 0)
      .filter((r) => !q || r.emp.name.toLowerCase().includes(q));

    rows.sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      return a.emp.name.localeCompare(b.emp.name);
    });

    return rows;
  }

  // ----- DOM helpers -----
  const podiumEl    = document.getElementById('podium');
  const listEl      = document.getElementById('ranking-list');
  const emptyEl     = document.getElementById('empty-state');
  const tplPodium   = document.getElementById('tpl-podium-slot');
  const tplRow      = document.getElementById('tpl-row');
  const yearSelect  = document.getElementById('filter-year');
  const quarterSel  = document.getElementById('filter-quarter');
  const catSelect   = document.getElementById('filter-category');
  const searchInput = document.getElementById('search');

  // Registry of all dropdown close functions — ensures only one is open at a time.
  const allDropdownClosers = [];

  // Custom dropdown — avoids the native-select OS-level black-flash on Windows.
  function makeDropdown(wrap, placeholder, values, onChange) {
    const btn   = wrap.querySelector('.select');
    const list  = wrap.querySelector('.dd-list');
    const label = wrap.querySelector('.select-value');

    function addOption(val, text, isCurrent) {
      const li = document.createElement('li');
      li.className   = 'dd-option' + (isCurrent ? ' dd-option--selected' : '');
      li.role        = 'option';
      li.dataset.value = val;
      li.textContent = text;
      li.addEventListener('click', (e) => { e.stopPropagation(); select(val, text); });
      list.appendChild(li);
    }
    addOption('', placeholder, true);   // "All X" is selected by default
    values.forEach((v) => addOption(v, v, false));

    function open() {
      // Close every other dropdown before opening this one
      allDropdownClosers.forEach((fn) => fn !== close && fn());
      btn.setAttribute('aria-expanded', 'true');
      // Set exact height before revealing so the browser never needs a scrollbar gutter
      const ITEM_H   = 34;
      const MAX_SHOW = 12;
      const count    = list.children.length;
      list.style.height    = (Math.min(count, MAX_SHOW) * ITEM_H) + 'px';
      list.style.overflowY = count > MAX_SHOW ? 'auto' : 'hidden';
      list.hidden = false;
      btn.classList.remove('select--flash');
      void btn.offsetWidth;
      btn.classList.add('select--flash');
      btn.addEventListener('animationend', () => btn.classList.remove('select--flash'), { once: true });
    }
    function close() { btn.setAttribute('aria-expanded', 'false'); list.hidden = true; }

    function select(val, text) {
      label.textContent = text;
      list.querySelectorAll('.dd-option').forEach((o) =>
        o.classList.toggle('dd-option--selected', o.dataset.value === val)
      );
      close();
      onChange(val);
    }

    allDropdownClosers.push(close);
    btn.addEventListener('click', (e) => { e.stopPropagation(); list.hidden ? open() : close(); });
    document.addEventListener('click', close);
  }

  // Build a Fluent UI MDL2 icon `<i>` element. The locally-bundled MDL2 font
  // (loaded via @font-face in styles.css) renders the actual glyph for the
  // given data-icon-name, matching the original page pixel-for-pixel.
  function makeIcon(name) {
    const i = document.createElement('i');
    i.className = 'ms-Icon';
    i.dataset.iconName = name;
    i.setAttribute('aria-hidden', 'true');
    return i;
  }

  function makeCounter(iconName, category, count) {
    const el = document.createElement('span');
    el.className = 'counter';
    el.title = category;
    el.appendChild(makeIcon(iconName));
    const span = document.createElement('span');
    span.textContent = count;
    el.appendChild(span);
    return el;
  }

  function makeActivityRow(a) {
    const tr = document.createElement('tr');

    const tdTitle = document.createElement('td');
    tdTitle.className = 'activity-title';
    tdTitle.textContent = a.title;
    tr.appendChild(tdTitle);

    const tdCat = document.createElement('td');
    const catSpan = document.createElement('span');
    catSpan.className = 'activity-category';
    catSpan.textContent = a.category;
    tdCat.appendChild(catSpan);
    tr.appendChild(tdCat);

    const tdDate = document.createElement('td');
    tdDate.className = 'activity-date';
    tdDate.textContent = formatPretty(a.date);
    tr.appendChild(tdDate);

    const tdPts = document.createElement('td');
    tdPts.className = 'activity-points';
    tdPts.textContent = '+' + a.points;
    tr.appendChild(tdPts);

    return tr;
  }

  // ----- Rendering -----
  function renderPodium(view) {
    podiumEl.replaceChildren();
    const top3 = view.slice(0, 3);
    if (top3.length === 0) return;

    const order = [
      { rank: 2, slot: 'second', data: top3[1] },
      { rank: 1, slot: 'first',  data: top3[0] },
      { rank: 3, slot: 'third',  data: top3[2] },
    ].filter((o) => o.data);

    order.forEach(({ rank, slot, data }) => {
      const node = tplPodium.content.firstElementChild.cloneNode(true);
      node.classList.add('podium-slot--' + slot);
      const avatar = node.querySelector('.podium-avatar');
      avatar.src = data.emp.avatar;
      avatar.alt = data.emp.name;
      node.querySelector('.podium-rank-badge').textContent = rank;
      node.querySelector('.podium-name').textContent = data.emp.name;
      node.querySelector('.podium-role').textContent = data.emp.role + ' (' + data.emp.code + ')';
      node.querySelector('.podium-points').textContent = data.total;
      node.querySelector('.podium-block-num').textContent = rank;
      podiumEl.appendChild(node);
    });
  }

  function renderRow(rank, item) {
    const { emp, total, filtered, counts } = item;
    const node = tplRow.content.firstElementChild.cloneNode(true);
    node.dataset.id = emp.id;

    node.querySelector('.row-rank').textContent = rank;
    const avatar = node.querySelector('.row-avatar');
    avatar.src = emp.avatar;
    avatar.alt = emp.name;
    node.querySelector('.row-name').textContent = emp.name;
    node.querySelector('.row-role').textContent = emp.role + ' (' + emp.code + ')';
    node.querySelector('.row-total-num').textContent = total;

    const counters = node.querySelector('.row-counters');
    if (counts['Public Speaking'] > 0) {
      counters.appendChild(makeCounter('Presentation', 'Public Speaking', counts['Public Speaking']));
    }
    if (counts['Education'] > 0) {
      counters.appendChild(makeCounter('Education', 'Education', counts['Education']));
    }
    if (counts['University Partnership'] > 0) {
      counters.appendChild(makeCounter('Emoji2', 'University Partnership', counts['University Partnership']));
    }

    const tbody = node.querySelector('.activity-table tbody');
    filtered.forEach((a) => tbody.appendChild(makeActivityRow(a)));

    const summary = node.querySelector('.row-summary');
    const panel = node.querySelector('.row-panel');
    const isOpen = state.expanded.has(emp.id);
    summary.setAttribute('aria-expanded', String(isOpen));
    panel.hidden = !isOpen;
    summary.addEventListener('click', () => {
      const open = !state.expanded.has(emp.id);
      if (open) state.expanded.add(emp.id);
      else state.expanded.delete(emp.id);
      summary.setAttribute('aria-expanded', String(open));
      panel.hidden = !open;
    });

    return node;
  }

  function render() {
    const view = computeView();
    renderPodium(view);
    listEl.replaceChildren();
    if (view.length === 0) {
      emptyEl.hidden = false;
      return;
    }
    emptyEl.hidden = true;
    view.forEach((item, idx) => {
      listEl.appendChild(renderRow(idx + 1, item));
    });
  }

  // ----- Event wiring -----
  function init() {
    makeDropdown(yearSelect, 'All Years',      YEARS,      (v) => { state.year     = v; render(); });
    makeDropdown(quarterSel, 'All Quarters',   QUARTERS,   (v) => { state.quarter  = v; render(); });
    makeDropdown(catSelect,  'All Categories', CATEGORIES, (v) => { state.category = v; render(); });
    searchInput.addEventListener('input', (e) => { state.query = e.target.value; render(); });

    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
