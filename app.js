(() => {
  const STORAGE_PREFIX = 'membersApp:';
  const DEFAULT_DAY = 'd1';

  const TITLE_BY_DAY = {
    d1: '2026年11月3日(月･祝)',
    d2: '2026年11月4日(火)',
    d3: '2026年11月5日(水)',
  };

  const MEMBERS_KEY = `${STORAGE_PREFIX}members`;
  const $ = (sel, root = document) => root.querySelector(sel);

  function safeJsonParse(text, fallback) {
    try { return JSON.parse(text); } catch { return fallback; }
  }

  function getDayKeyFromHash() {
    const hash = location.hash || '';
    const parts = hash.split('/'); // ['#','section','d1']
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

  function getMembers(){
    return safeJsonParse(localStorage.getItem(MEMBERS_KEY) || '[]', []);
  }
  function setMembers(list){
    localStorage.setItem(MEMBERS_KEY, JSON.stringify(list));
  }

  function parseCSV(text){
    const s = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const rows = [];
    let row = [], cur = '', inQuotes = false;

    for (let i = 0; i < s.length; i++){
      const ch = s[i], next = s[i+1];
      if (ch === '"'){
        if (inQuotes && next === '"'){ cur += '"'; i++; }
        else { inQuotes = !inQuotes; }
        continue;
      }
      if (!inQuotes && ch === ','){ row.push(cur); cur=''; continue; }
      if (!inQuotes && ch === '\n'){ row.push(cur); rows.push(row); row=[]; cur=''; continue; }
      cur += ch;
    }
    row.push(cur); rows.push(row);

    return rows
      .map(r => r.map(c => (c ?? '').trim()))
      .filter(r => r.some(c => c !== ''));
  }

  function csvToMembers(csvText){
    const rows = parseCSV(csvText);
    if (!rows.length) throw new Error('CSVが空です');

    const head = rows[0].map(s => (s || '').replace(/\s/g,''));
    const looksHeader = head.some(h => {
      const x = h.toLowerCase();
      return x.includes('氏名') || x.includes('かな') || x.includes('生年') || x.includes('性別')
          || x.includes('name') || x.includes('kana') || x.includes('birth') || x.includes('gender');
    });

    const dataRows = looksHeader ? rows.slice(1) : rows;

    const members = [];
    for (const r of dataRows){
      const name = (r[0] || '').trim();
      const kana = (r[1] || '').trim();
      const birthYear = (r[2] || '').trim();
      const gender = (r[3] || '').trim();
      if (!name) continue;
      members.push({ name, kana, birthYear: birthYear || '', gender: gender || '' });
    }
    if (!members.length) throw new Error('有効な氏名が見つかりませんでした');
    return members;
  }

  function rowTemplate() {
    return `
      <div class="row-group" role="rowgroup" aria-label="データ行">
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
        <button class="row-del" type="button" title="この行を削除">🗑</button>
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
      slot.innerHTML = `<button class="row-swap" type="button" title="この境界の上下を入れ替え">⇅</button>`;
      rows[i].after(slot);
    }
  }

  const ALIGN_FIELDS = new Set(['sectionTop','sectionBottom','notes']);
  function applyAlign(cell, align) {
    cell.dataset.align = align;
    cell.style.textAlign = align === 'left' ? 'left' : align === 'right' ? 'right' : 'center';
    cell.style.justifyContent = align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center';
  }
  function getAlign(cell){ return cell.dataset.align || 'center'; }

  function serializeRows() {
    const rowsEl = $('#rows');
    if (!rowsEl) return [];
    return Array.from(rowsEl.querySelectorAll('.row-group')).map(group => {
      const obj = {};
      group.querySelectorAll('[data-field]').forEach(cell => {
        const field = cell.dataset.field;
        const text = (cell.textContent || '').trim();
        if (ALIGN_FIELDS.has(field)) obj[field] = { t: text, a: getAlign(cell) };
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
    if (!raw) { rebuildSwapSlots(); return; }
    const data = safeJsonParse(raw, []);
    if (!Array.isArray(data)) { rebuildSwapSlots(); return; }

    for (const rowObj of data) {
      rowsEl.insertAdjacentHTML('beforeend', rowTemplate());
      const group = rowsEl.lastElementChild;
      group.querySelectorAll('[data-field]').forEach(cell => {
        const field = cell.dataset.field;
        const v = rowObj[field];
        if (ALIGN_FIELDS.has(field)) {
          if (v && typeof v === 'object') {
            cell.textContent = (v.t || '').trim();
            applyAlign(cell, v.a || 'center');
          } else if (typeof v === 'string') {
            cell.textContent = v;
            applyAlign(cell, 'center');
          } else {
            applyAlign(cell, 'center');
          }
        } else {
          if (typeof v === 'string') cell.textContent = v;
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

  function renderMembers(){
    const members = getMembers();
    $('#view').innerHTML = `
      <section>
        <div class="section-header" style="margin:12px 0;">
          <button id="btnMembersImport" class="btn-add" type="button">CSV取込</button>
          <button id="btnMembersExport" class="btn-add" type="button">CSV書出</button>
          <button id="btnMembersClear"  class="btn-add" type="button">全削除</button>
          <h2 style="margin:0 0 0 8px;">メンバー</h2>
        </div>

        <div class="members-table" role="table" aria-label="メンバー一覧">
          <div class="mcell head">氏名</div>
          <div class="mcell head">かな</div>
          <div class="mcell head">生年</div>
          <div class="mcell head">性別</div>

          ${members.map((m, idx) => `
            <div class="mcell" contenteditable="true" data-idx="${idx}" data-key="name">${escapeHtml(m.name)}</div>
            <div class="mcell" contenteditable="true" data-idx="${idx}" data-key="kana">${escapeHtml(m.kana)}</div>
            <div class="mcell" contenteditable="true" data-idx="${idx}" data-key="birthYear">${escapeHtml(m.birthYear)}</div>
            <div class="mcell" contenteditable="true" data-idx="${idx}" data-key="gender">${escapeHtml(m.gender)}</div>
          `).join('')}
        </div>

        <input id="membersFile" type="file" accept=".csv,text/csv" style="display:none;" />
      </section>
    `;

    const fileInput = $('#membersFile');
    $('#btnMembersImport').addEventListener('click', ()=> fileInput.click());

    fileInput.addEventListener('change', async ()=>{
      const f = fileInput.files && fileInput.files[0];
      if (!f) return;
      const text = await f.text();
      try{
        const list = csvToMembers(text);
        setMembers(list);
        alert(`メンバーを登録しました（${list.length}件）`);
        renderMembers();
      }catch(err){
        alert(`CSV取込失敗: ${err.message || err}`);
      }finally{
        fileInput.value = '';
      }
    });

    $('#btnMembersExport').addEventListener('click', ()=>{
      const list = getMembers();
      const bom = '\uFEFF';
      const lines = [
        '氏名,かな,生年,性別',
        ...list.map(m => [m.name, m.kana, m.birthYear, m.gender].map(csvEscape).join(','))
      ];
      const blob = new Blob([bom + lines.join('\n')], {type:'text/csv;charset=utf-8;'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'members.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });

    $('#btnMembersClear').addEventListener('click', ()=>{
      if (!confirm('メンバーを全削除します。よろしいですか？')) return;
      setMembers([]);
      renderMembers();
    });

    let t = null;
    $('#view').addEventListener('input', (e)=>{
      const cell = e.target.closest('.members-table .mcell[data-idx]');
      if (!cell) return;
      const idx = Number(cell.dataset.idx);
      const key = cell.dataset.key;
      const val = (cell.textContent || '').trim();

      const list = getMembers();
      if (!list[idx]) return;
      list[idx][key] = val;

      clearTimeout(t);
      t = setTimeout(()=> setMembers(list), 250);
    });
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
          <h2 class="sheet-title" id="sectionTitleHeading" title="クリックで編集">${titleDefault}</h2>
        </div>

        <div class="first-row-table" role="table" aria-label="固定先頭行（区間・楽器）">
