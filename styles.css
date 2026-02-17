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

  // メンバー保存キー
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
    const parts = hash.split('/'); // ['#','section','d1']
    if (parts[1] !== 'section') return null;
    const k = (parts[2] || DEFAULT_DAY).toLowerCase();
    return (k === 'd1' || k === 'd2' || k === 'd3') ? k : DEFAULT_DAY;
  }

  const titleKey = (dayKey) => `${STORAGE_PREFIX}title:${dayKey}`;
  const rowsKey  = (dayKey)  => `${STORAGE_PREFIX}rows:${dayKey}`;

  // HTMLエスケープ（members表表示用）
  function escapeHtml(s){
    return (s ?? '').toString()
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;');
  }

  // CSVセル用エスケープ（書き出し）
  function csvEscape(s){
    const v = (s ?? '').toString();
    if (/[",\n]/.test(v)) return `"${v.replace(/"/g,'""')}"`;
    return v;
  }

  // =========================
  // メンバー（localStorage）
  // =========================
  function getMembers(){
    return safeJsonParse(localStorage.getItem(MEMBERS_KEY) || '[]', []);
  }

  function setMembers(list){
    localStorage.setItem(MEMBERS_KEY, JSON.stringify(list));
  }

  // =========================
  // CSV パース（Excelの "" 対応）
  // =========================
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
        if (inQuotes && next === '"'){ // "" -> "
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (!inQuotes && ch === ','){
        row.push(cur);
        cur = '';
        continue;
      }

      if (!inQuotes && ch === '\n'){
        row.push(cur);
        rows.push(row);
        row = [];
        cur = '';
        continue;
      }

      cur += ch;
    }

    row.push(cur);
    rows.push(row);

    // 空行除去 + trim
    return rows
      .map(r => r.map(c => (c ?? '').trim()))
      .filter(r => r.some(c => c !== ''));
  }

  // A=氏名 B=かな C=生年 D=性別（C/D空欄OK）
  // ヘッダ行（氏名/かな/生年/性別 など）があれば自動でスキップ
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
      const name = (r[0] || '').trim();      // A
      const kana = (r[1] || '').trim();      // B
      const birthYear = (r[2] || '').trim(); // C（空欄OK）
      const gender = (r[3] || '').trim();    // D（空欄OK）

      if (!name) continue;

      members.push({
        name,
        kana,
        birthYear: birthYear || '',
        gender: gender || ''
      });
    }

    if (!members.length) throw new Error('有効な氏名が見つかりませんでした');
    return members;
  }

  // =========================
  // 表（/section）行テンプレ
  // =========================
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

  // 行間スワップスロット（⇅）を再構成（最下段には作らない）
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

  // =========================
  // /section 保存・復元
  // =========================
  // 区間/備考：{t,a} 形式（a=left/center/right）にも対応（後方互換）
  const ALIGN_FIELDS = new Set(['sectionTop','sectionBottom','notes']);

  function applyAlign(cell, align) {
    cell.dataset.align = align;
    cell.style.textAlign = align === 'left' ? 'left' : align === 'right' ? 'right' : 'center';
    cell.style.justifyContent = align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center';
  }
  function getAlign(cell){
    return cell.dataset.align || 'center';
  }

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

  // =========================
  // メンバー画面（/members）
  // =========================
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

    // CSV書出（UTF-8 BOM付き：Excel向け）
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

    // 全削除
    $('#btnMembersClear').addEventListener('click', ()=>{
      if (!confirm('メンバーを全削除します。よろしいですか？')) return;
      setMembers([]);
      renderMembers();
    });

    // 編集保存（デバウンス）
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
    }, { once: true }); // 二重登録防止（renderMembersごとに付け直す）
  }

  // =========================
  // /section 画面
  // =========================
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
          <div class="cell" role="columnheader">区間・場所</div>
          <div class="cell" role="columnheader">大胴</div>
          <div class="cell" role="columnheader">中胴</div>
          <div class="cell" role="columnheader">側胴</div>
          <div class="cell" role="columnheader">鉦</div>
          <div class="cell" role="columnheader">笛</div>
          <div class="cell" role="columnheader">備考</div>
        </div>

        <div id="rows" class="rows"></div>
      </section>
    `;

    // タイトル復元＆編集
    const h = $('#sectionTitleHeading');
    const saved = localStorage.getItem(titleKey(dayKey));
    if (saved && saved.trim()) h.textContent = saved.trim();
    h.addEventListener('click', () => {
      const current = localStorage.getItem(titleKey(dayKey)) || h.textContent;
      const input = window.prompt('タイトルを入力してください。', current);
      if (input === null) return;
      const next = input.trim();
      if (!next) return;
      localStorage.setItem(titleKey(dayKey), next);
      h.textContent = next;
    });

    restoreRows(dayKey);

    // sticky帯の top を計算（あなたの固定レイアウト用）
    if (typeof setStickyOffsets === 'function') setStickyOffsets?.(); // 既存の固定関数がある場合に備える
  }

  function renderCover() {
    $('#view').innerHTML = '<section><h2>表紙</h2></section>';
  }

  // =========================
  // ルーティング
  // =========================
  function initRouting() {
    if (typeof window.route !== 'function' || typeof window.navigate !== 'function') {
      $('#view').textContent = 'router.js の読み込みに失敗しました';
      return;
    }

    window.route('/cover', () => renderCover());
    window.route('/section', (rest) => renderSection(rest));
    window.route('/members', () => renderMembers());
    window.route('/404', () => { $('#view').textContent = '404'; });

    if (!location.hash) location.hash = '#/cover';
    window.navigate();
  }

  // =========================
  // イベント（/section 用）
  // =========================
  let selectedCell = null;

  function initEvents() {
    // click（追加/削除/スワップ/配置）
    $('#view').addEventListener('click', (e) => {
      const t = (e.target && e.target.nodeType === 3) ? e.target.parentElement : e.target;
      const dayKey = getDayKeyFromHash();

      // 配置：区間/備考セル選択
      const cell = t.closest('#rows .cell[contenteditable="true"]');
      if (cell && cell.dataset && ALIGN_FIELDS.has(cell.dataset.field)) {
        if (selectedCell) selectedCell.style.outline = '';
        selectedCell = cell;
        selectedCell.style.outline = '2px solid rgba(0,0,0,.3)';
        selectedCell.style.outlineOffset = '-2px';
      }

      // 削除
      const del = t.closest('.row-del');
      if (del) {
        e.preventDefault(); e.stopPropagation();
        del.closest('.row-group')?.remove();
        if (dayKey) { saveRows(dayKey); rebuildSwapSlots(); }
        return;
      }

      // 行間スワップ
      const swapBtn = t.closest('.swap-slot .row-swap');
      if (swapBtn) {
        e.preventDefault(); e.stopPropagation();
        const rowsEl = $('#rows');
        if (!rowsEl || !dayKey) return;

        const slot  = swapBtn.closest('.swap-slot');
        const upper = slot?.previousElementSibling;
        const lower = slot?.nextElementSibling;
        if (!upper || !lower) return;
        if (!upper.classList.contains('row-group')) return;
        if (!lower.classList.contains('row-group')) return;

        const activeField = document.activeElement?.closest('.cell[data-field]')?.dataset?.field || null;
        rowsEl.insertBefore(lower, upper);
        rebuildSwapSlots();
        if (activeField) lower.querySelector(`.cell[data-field="${activeField}"]`)?.focus();
        saveRows(dayKey);
        return;
      }

      // 追加
      const add = t.closest('#btnAddInline');
      if (add) {
        const rowsEl = $('#rows');
        if (!rowsEl || !dayKey) return;
        rowsEl.insertAdjacentHTML('beforeend', rowTemplate());
        rowsEl.lastElementChild?.querySelector('[data-field="sectionTop"]')?.focus();
        saveRows(dayKey);
        rebuildSwapSlots();
        return;
      }

      // 配置ボタン（左/中/右）
      const alignBtn = t.closest('#inlineAlign button[data-align]');
      if (alignBtn && selectedCell && dayKey) {
        applyAlign(selectedCell, alignBtn.dataset.align);
        saveRows(dayKey);
        return;
      }
    });

    // input（/section 保存）
    $('#view').addEventListener('input', (e) => {
      if (!e.target.closest('#rows')) return;
      const dayKey = getDayKeyFromHash();
      if (!dayKey) return;
      scheduleSave(dayKey);
    });

    // Tab 全選択（/section）
    $('#view').addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const cell = e.target.closest('#rows .cell[contenteditable="true"]');
      if (!cell) return;

      e.preventDefault();
      const list = Array.from(document.querySelectorAll('#rows .cell[contenteditable="true"]'));
      const i = list.indexOf(cell);
      if (i === -1) return;

      const j = !e.shiftKey ? Math.min(i + 1, list.length - 1) : Math.max(i - 1, 0);
      const next = list[j];
      if (!next) return;

      next.focus();
      setTimeout(() => {
        const sel = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(next);
        sel.removeAllRanges();
        sel.addRange(range);
      }, 0);
    });

    // 印刷
    document.getElementById('btnPrint')?.addEventListener('click', () => window.print());
  }

  // =========================
  // 起動
  // =========================
  document.addEventListener('DOMContentLoaded', () => {
    initRouting();
    initEvents();
  });
})();
