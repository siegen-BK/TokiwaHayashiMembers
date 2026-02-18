(() => {
  // =========================
  // 設定
  // =========================
  const STORAGE_PREFIX = 'membersApp:';
  const DEFAULT_DAY = 'd1';

  const TITLE_BY_DAY = {
    d1: '2026年11月3日(月･祝)',
    d2: '2026年11月4日(火)',
    d3: '2026年11月5日(水)',
  };

  const MEMBERS_KEY = `${STORAGE_PREFIX}members`;

  // =========================
  // ユーティリティ
  // =========================
  const $ = (sel, root = document) => root.querySelector(sel);

  function safeJsonParse(text, fallback) {
    try { return JSON.parse(text); } catch { return fallback; }
  }

  function getDayKeyFromHash() {
    const hash = location.hash || '';
    const parts = hash.split('/'); 
    if (parts[1] !== 'section') return null;
    const k = (parts[2] || DEFAULT_DAY).toLowerCase();
    return (k === 'd1' || k === 'd2' || k === 'd3') ? k : DEFAULT_DAY;
  }

  const titleKey = (dayKey) => `${STORAGE_PREFIX}title:${dayKey}`;
  const rowsKey  = (dayKey)  => `${STORAGE_PREFIX}rows:${dayKey}`;

  function escapeHtml(s){
    return (s ?? '').toString()
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;');
  }

  function csvEscape(s){
    const v = (s ?? '').toString();
    if (/[",\n]/.test(v)) return `"${v.replace(/"/g,'""')}"`;
    return v;
  }

  // =========================
  // レイアウト調整（追加機能）
  // =========================
  // ヘッダーやツールバーの高さを計測し、CSS変数に反映させて重なりを防ぐ
  function updateStickyLayout() {
    const header = $('.app-header');
    const toolbar = $('.section-toolbar');
    if (!header) return;

    const hHeight = header.offsetHeight;
    document.documentElement.style.setProperty('--sticky-top-toolbar', `${hHeight}px`);

    if (toolbar) {
      const tHeight = toolbar.offsetHeight;
      document.documentElement.style.setProperty('--toolbar-h', `${tHeight}px`);
      // 表のヘッダー固定位置 = タブ高 + ツールバー高
      document.documentElement.style.setProperty('--sticky-top-tablehead', `${hHeight + tHeight}px`);
    }
  }

  // =========================
  // メンバー管理
  // =========================
  function getMembers(){
    return safeJsonParse(localStorage.getItem(MEMBERS_KEY) || '[]', []);
  }

  function setMembers(list){
    localStorage.setItem(MEMBERS_KEY, JSON.stringify(list));
  }

  function parseCSV(text){
    const s = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const rows = [];
    let row = [];
    let cur = '';
    let inQuotes = false;

    for (let i = 0; i < s.length; i++){
      const ch = s[i];
      const next = s[i+1];
      if (ch === '"'){
        if (inQuotes && next === '"'){ cur += '"'; i++; } 
        else { inQuotes = !inQuotes; }
        continue;
      }
      if (!inQuotes && ch === ','){ row.push(cur); cur = ''; continue; }
      if (!inQuotes && ch === '\n'){ row.push(cur); rows.push(row); row = []; cur = ''; continue; }
      cur += ch;
    }
    row.push(cur);
    rows.push(row);
    return rows.map(r => r.map(c => (c ?? '').trim())).filter(r => r.some(c => c !== ''));
  }

  function csvToMembers(csvText){
    const rows = parseCSV(csvText);
    if (!rows.length) throw new Error('CSVが空です');
    const head = rows[0].map(s => (s || '').replace(/\s/g,''));
    const looksHeader = head.some(h => {
      const x = h.toLowerCase();
      return x.includes('氏名') || x.includes('かな') || x.includes('生年') || x.includes('性別');
    });
    const dataRows = looksHeader ? rows.slice(1) : rows;
    const members = [];
    for (const r of dataRows){
      const name = (r[0] || '').trim();
      if (!name) continue;
      members.push({ name, kana: (r[1] || '').trim(), birthYear: (r[2] || '').trim(), gender: (r[3] || '').trim() });
    }
    return members;
  }

  // =========================
  // 表（/section）操作
  // =========================
  function rowTemplate() {
    return `
      <div class="row-group" role="rowgroup">
        <div class="cell" style="grid-column:1; grid-row:1;" contenteditable="true" data-field="sectionTop"></div>
        <div class="cell" style="grid-column:1; grid-row:2;" contenteditable="true" data-field="sectionBottom"></div>
        <div class="cell span2" style="grid-column:2; grid-row:1 / span 2;" contenteditable="true" data-field="daido"></div>
        <div class="cell span2" style="grid-column:3; grid-row:1 / span 2;" contenteditable="true" data-field="chudo"></div>
        <div class="cell span2" style="grid-column:4; grid-row:1 / span 2;" contenteditable="true" data-field="sokudo"></div>
        <div class="cell" style="grid-column:5; grid-row:1;" contenteditable="true" data-field="kaneTop"></div>
        <div class="cell split-top" style="grid-column:5; grid-row:2;" contenteditable="true" data-field="kaneBottom"></div>
        <div class="cell" style="grid-column:6; grid-row:1;" contenteditable="true" data-field="fueTop"></div>
        <div class="cell split-top" style="grid-column:6; grid-row:2;" contenteditable="true" data-field="fueBottom"></div>
        <div class="cell span2" style="grid-column:7; grid-row:1 / span 2;" contenteditable="true" data-field="notes"></div>
        <button class="row-tools" type="button" title="ツール">⋯</button>
        <button class="row-del" type="button" title="削除">🗑</button>
      </div>
    `;
  }

  function rebuildSwapSlots(){
    const rowsEl = $('#rows');
    if (!rowsEl) return;
    rowsEl.querySelectorAll('.swap-slot').forEach(el => el.remove());
    const rows = Array.from(rowsEl.querySelectorAll('.row-group'));
    for (let i = 0; i < rows.length - 1; i++){
      const slot = document.createElement('div');
      slot.className = 'swap-slot';
      slot.innerHTML = `<button class="row-swap" type="button">⇅</button>`;
      rows[i].after(slot);
    }
  }

  const ALIGN_FIELDS = new Set(['sectionTop','sectionBottom','notes']);

  function applyAlign(cell, align) {
    cell.dataset.align = align;
    cell.style.textAlign = align;
    cell.style.justifyContent = align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center';
  }

  function serializeRows() {
    const rowsEl = $('#rows');
    if (!rowsEl) return [];
    return Array.from(rowsEl.querySelectorAll('.row-group')).map(group => {
      const obj = {};
      group.querySelectorAll('[data-field]').forEach(cell => {
        const field = cell.dataset.field;
        const text = (cell.textContent || '').trim();
        if (ALIGN_FIELDS.has(field)) obj[field] = { t: text, a: cell.dataset.align || 'center' };
        else obj[field] = text;
      });
      return obj;
    });
  }

  function saveRows(dayKey) {
    localStorage.setItem(rowsKey(dayKey), JSON.stringify(serializeRows()));
  }

  function restoreRows(dayKey) {
    const rowsEl = $('#rows');
    if (!rowsEl) return;
    rowsEl.innerHTML = '';
    const raw = localStorage.getItem(rowsKey(dayKey));
    const data = safeJsonParse(raw, []);
    for (const rowObj of data) {
      rowsEl.insertAdjacentHTML('beforeend', rowTemplate());
      const group = rowsEl.lastElementChild;
      group.querySelectorAll('[data-field]').forEach(cell => {
        const field = cell.dataset.field;
        const v = rowObj[field];
        if (ALIGN_FIELDS.has(field) && v && typeof v === 'object') {
          cell.textContent = v.t;
          applyAlign(cell, v.a);
        } else {
          cell.textContent = typeof v === 'string' ? v : (v?.t || '');
        }
      });
    }
    rebuildSwapSlots();
  }

  let saveTimer = null;
  function scheduleSave(dayKey) {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveRows(dayKey), 250);
  }

  // =========================
  // 描画メイン
  // =========================
  function renderMembers(){
    const members = getMembers();
    $('#view').innerHTML = `
      <section>
        <div class="section-header" style="margin:12px 0;">
          <button id="btnMembersImport" class="btn-add">CSV取込</button>
          <button id="btnMembersExport" class="btn-add">CSV書出</button>
          <button id="btnMembersClear"  class="btn-add">全削除</button>
          <h2 style="display:inline; margin-left:10px;">メンバー一覧</h2>
        </div>
        <div class="members-table">
          <div class="mcell head">氏名</div><div class="mcell head">かな</div>
          <div class="mcell head">生年</div><div class="mcell head">性別</div>
          ${members.map((m, idx) => `
            <div class="mcell" contenteditable="true" data-idx="${idx}" data-key="name">${escapeHtml(m.name)}</div>
            <div class="mcell" contenteditable="true" data-idx="${idx}" data-key="kana">${escapeHtml(m.kana)}</div>
            <div class="mcell" contenteditable="true" data-idx="${idx}" data-key="birthYear">${escapeHtml(m.birthYear)}</div>
            <div class="mcell" contenteditable="true" data-idx="${idx}" data-key="gender">${escapeHtml(m.gender)}</div>
          `).join('')}
        </div>
        <input id="membersFile" type="file" accept=".csv" style="display:none;" />
      </section>
    `;
    updateStickyLayout();
  }

  function renderSection(rest) {
    const dayKey = (rest || DEFAULT_DAY).toLowerCase();
    const titleDefault = TITLE_BY_DAY[dayKey] || TITLE_BY_DAY[DEFAULT_DAY];

    $('#view').innerHTML = `
      <section>
        <div class="section-toolbar">
          <div class="toolbar-left">
            <div class="align-inline" id="inlineAlign">
              <button type="button" data-align="left">左</button>
              <button type="button" data-align="center">中</button>
              <button type="button" data-align="right">右</button>
            </div>
            <button id="btnAddInline" class="btn-add" type="button">＋ 追加</button>
          </div>
          <h2 class="sheet-title" id="sectionTitleHeading">${titleDefault}</h2>
        </div>
        <div class="first-row-table">
          <div class="cell">区間・場所</div><div class="cell">大胴</div>
          <div class="cell">中胴</div><div class="cell">側胴</div>
          <div class="cell">鉦</div><div class="cell">笛</div>
          <div class="cell">備考</div>
        </div>
        <div id="rows" class="rows"></div>
      </section>
    `;

    const h = $('#sectionTitleHeading');
    const saved = localStorage.getItem(titleKey(dayKey));
    if (saved) h.textContent = saved;
    h.addEventListener('click', () => {
      const input = window.prompt('タイトル編集', h.textContent);
      if (input) { localStorage.setItem(titleKey(dayKey), input); h.textContent = input; }
    });

    restoreRows(dayKey);
    // 描画後に高さを計算
    setTimeout(updateStickyLayout, 0);
  }

  // =========================
  // 初期化・イベント
  // =========================
  function initRouting() {
    window.route('/cover',   () => { $('#view').innerHTML = '<h2>表紙</h2>'; updateStickyLayout(); });
    window.route('/section', (rest) => renderSection(rest));
    window.route('/members', () => renderMembers());
    window.navigate();
  }

  let selectedCell = null;
  function initEvents() {
    window.addEventListener('resize', updateStickyLayout);

    $('#view').addEventListener('click', (e) => {
      const t = e.target;
      const dayKey = getDayKeyFromHash();

      const cell = t.closest('#rows .cell[contenteditable="true"]');
      if (cell && ALIGN_FIELDS.has(cell.dataset.field)) {
        if (selectedCell) selectedCell.style.outline = '';
        selectedCell = cell;
        selectedCell.style.outline = '2px solid #000';
      }

      if (t.closest('.row-del')) {
        t.closest('.row-group').remove();
        saveRows(dayKey); rebuildSwapSlots();
      }

      if (t.closest('.row-swap')) {
        const slot = t.closest('.swap-slot');
        const upper = slot.previousElementSibling;
        const lower = slot.nextElementSibling;
        if (upper && lower) {
          lower.after(upper);
          rebuildSwapSlots(); saveRows(dayKey);
        }
      }

      if (t.closest('#btnAddInline')) {
        $('#rows').insertAdjacentHTML('beforeend', rowTemplate());
        rebuildSwapSlots(); saveRows(dayKey);
      }

      if (t.dataset.align && selectedCell) {
        applyAlign(selectedCell, t.dataset.align);
        saveRows(dayKey);
      }
    });

    $('#view').addEventListener('input', (e) => {
      const dayKey = getDayKeyFromHash();
      if (dayKey) scheduleSave(dayKey);
    });

    document.getElementById('btnPrint')?.addEventListener('click', () => window.print());
  }

  document.addEventListener('DOMContentLoaded', () => {
    initRouting();
    initEvents();
  });
})();
