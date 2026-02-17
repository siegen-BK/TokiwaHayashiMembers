(() => {
  // ========= 設定 =========
  const STORAGE_PREFIX = 'membersApp:'; // localStorageキー接頭辞
  const DEFAULT_DAY = 'd1';

  const TITLE_BY_DAY = {
    d1: '2026年11月3日(月･祝)',
    d2: '2026年11月4日(火)',
    d3: '2026年11月5日(水)',
  };

  // ========= ユーティリティ =========
  const $ = (sel, root = document) => root.querySelector(sel);

  function getDayKeyFromHash() {
    const hash = location.hash || '';
    const parts = hash.split('/'); // ['#','section','d1']
    if (parts[1] !== 'section') return null;
    const k = (parts[2] || DEFAULT_DAY).toLowerCase();
    return (k === 'd1' || k === 'd2' || k === 'd3') ? k : DEFAULT_DAY;
  }

  const titleKey = (dayKey) => `${STORAGE_PREFIX}title:${dayKey}`;
  const rowsKey  = (dayKey)  => `${STORAGE_PREFIX}rows:${dayKey}`;

  function safeJsonParse(text, fallback) {
    try { return JSON.parse(text); } catch { return fallback; }
  }

  // ========= 行テンプレ（2段＋ぶち抜き） =========
  function rowTemplate() {
    return `
      <div class="row-group" role="rowgroup" aria-label="データ行">
        <!-- 区間・場所（上下2段）＝フリー入力＆行ごと揃え -->
        <div class="cell" style="grid-column:1; grid-row:1;" contenteditable="true" data-field="sectionTop"></div>
        <div class="cell" style="grid-column:1; grid-row:2;" contenteditable="true" data-field="sectionBottom"></div>

        <!-- 大胴／中胴／側胴（2段ぶち抜き） -->
        <div class="cell span2" style="grid-column:2; grid-row:1 / span 2;" contenteditable="true" data-field="daido"></div>
        <div class="cell span2" style="grid-column:3; grid-row:1 / span 2;" contenteditable="true" data-field="chudo"></div>
        <div class="cell span2" style="grid-column:4; grid-row:1 / span 2;" contenteditable="true" data-field="sokudo"></div>

        <!-- 鉦（上下2段）※下段のみ split-top -->
        <div class="cell" style="grid-column:5; grid-row:1;" contenteditable="true" data-field="kaneTop"></div>
        <div class="cell split-top" style="grid-column:5; grid-row:2;" contenteditable="true" data-field="kaneBottom"></div>

        <!-- 笛（上下2段）※下段のみ split-top -->
        <div class="cell" style="grid-column:6; grid-row:1;" contenteditable="true" data-field="fueTop"></div>
        <div class="cell split-top" style="grid-column:6; grid-row:2;" contenteditable="true" data-field="fueBottom"></div>

        <!-- 備考（2段ぶち抜き）＝フリー入力＆行ごと揃え -->
        <div class="cell span2" style="grid-column:7; grid-row:1 / span 2;" contenteditable="true" data-field="notes"></div>

        <!-- 行削除（右余白） -->
        <button class="row-del"   type="button" title="この行を削除">🗑</button>
        <!-- 区間 2段結合/解除（左余白） -->
        <button class="row-merge" type="button" title="区間を2段結合/解除">⇅</button>
      </div>
    `;
  }

  // ========= Line（行）ユーティリティ =========
  // エスケープ（正しい順）
  const esc = (s) => (s || '')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;');

  // .cell の素テキストを .ln でラップ（既に .ln があれば触らない）
  function normalizeLines(cell) {
    if (cell.querySelector('.ln')) return;
    const raw = cell.innerText.replace(/\r/g, '');
    const lines = raw.split('\n');
    cell.innerHTML = lines.map(s => `<span class="ln align-center">${esc(s.trim())}</span>`).join('');
  }

  const _rebuildingCells = new WeakSet();
  let enterCloneAlign = null;  // Enter時の継承揃え
  let skipNextRebuild = false; // Enter直後のinputでrebuildしない

  // 既存 .ln の揃えを保持しつつ再構成（Enter継承も考慮）
  function rebuildLines(cell) {
    if (_rebuildingCells.has(cell)) return;
    _rebuildingCells.add(cell);

    const prevAligns = Array.from(cell.querySelectorAll('.ln')).map(ln => {
      if (ln.classList.contains('align-left'))  return 'left';
      if (ln.classList.contains('align-right')) return 'right';
      return 'center';
    });

    const text  = cell.innerText.replace(/\r/g,'');
    const lines = text.split('\n');
    cell.innerHTML = lines.map((s,i) => {
      const fallback = enterCloneAlign || prevAligns[i-1] || 'center';
      const a = prevAligns[i] || fallback;
      return `<span class="ln align-${a}">${esc(s.trim())}</span>`;
    }).join('');

    _rebuildingCells.delete(cell);
  }

  // .cell -> [{t,a}]
  function getLinesFromCell(cell) {
    const lns = cell.querySelectorAll('.ln');
    if (lns.length) {
      return Array.from(lns).map(ln => ({
        t: (ln.textContent || '').trim(),
        a: ln.classList.contains('align-left') ? 'left' :
           ln.classList.contains('align-right') ? 'right' : 'center'
      }));
    } else {
      const t = (cell.textContent || '').trim();
      const a =
        cell.classList.contains('align-left') ? 'left' :
        cell.classList.contains('align-right') ? 'right' : 'center';
      return t ? [{ t, a }] : [];
    }
  }

  // [{t,a}] -> .cell
  function setLinesToCell(cell, lines) {
    if (!lines || !lines.length) {
      cell.innerHTML = '';
      return;
    }
    cell.innerHTML = lines.map(({t,a}) => `<span class="ln align-${a || 'center'}">${esc(t || '')}</span>`).join('');
  }

  // キャレット位置の .ln
  function getCurrentLineInCell(cell) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    let node = sel.anchorNode;
    if (!node) return null;
    if (node.nodeType === 3) node = node.parentElement;
    return node.closest('.ln');
  }

  // キャレットを要素の末尾へ
  function placeCaretAtEnd(el) {
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function setLineAlign(ln, align) {
    ln.classList.remove('align-left','align-center','align-right');
    ln.classList.add(`align-${align}`);
  }

  // === 編集対象セレクタ ===
  const EDITABLE_LN_SEL =
    '#rows .cell[contenteditable="true"][data-field="sectionTop"], ' +
    '#rows .cell[contenteditable="true"][data-field="sectionBottom"], ' +
    '#rows .cell[contenteditable="true"][data-field="notes"]';

  const EDITABLE_ALL_SEL =
    EDITABLE_LN_SEL + ', ' +
    '#rows .cell[contenteditable="true"][data-field="daido"], ' +
    '#rows .cell[contenteditable="true"][data-field="chudo"], ' +
    '#rows .cell[contenteditable="true"][data-field="sokudo"], ' +
    '#rows .cell[contenteditable="true"][data-field="kaneTop"], ' +
    '#rows .cell[contenteditable="true"][data-field="kaneBottom"], ' +
    '#rows .cell[contenteditable="true"][data-field="fueTop"], ' +
    '#rows .cell[contenteditable="true"][data-field="fueBottom"]';

  // セル内容を全選択
  function selectAllInCell(cell){
    if (!cell) return;
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(cell);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  // Tab 用：隣の編集セル
  function findSiblingEditableCell(current, forward = true){
    const list = Array.from(document.querySelectorAll(EDITABLE_ALL_SEL));
    const i = list.indexOf(current);
    if (i === -1) return null;
    const j = forward ? Math.min(i + 1, list.length - 1) : Math.max(i - 1, 0);
    return list[j] || null;
  }

  // ========= 保存・復元 =========
  function serializeRows() {
    const rowsEl = $('#rows');
    if (!rowsEl) return [];
    return Array.from(rowsEl.querySelectorAll('.row-group')).map(group => {
      const obj = {};
      group.querySelectorAll('[data-field]').forEach(cell => {
        const lines = getLinesFromCell(cell);
        obj[cell.dataset.field] = { lines };
      });
      obj.__flags = { sectionMerged: group.classList.contains('merge-section') };
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
    if (!raw) return;

    const data = safeJsonParse(raw, []);
    if (!Array.isArray(data)) return;

    for (const rowObj of data) {
      rowsEl.insertAdjacentHTML('beforeend', rowTemplate());
      const group = rowsEl.lastElementChild;

      group.querySelectorAll('[data-field]').forEach(cell => {
        const v = rowObj[cell.dataset.field];

        if (v && Array.isArray(v.lines)) {
          setLinesToCell(cell, v.lines);
          return;
        }

        let text = '';
        let align = 'center';
        if (typeof v === 'string') {
          text = v;
        } else if (v && typeof v === 'object') {
          text  = v.t || '';
          align = v.a || 'center';
        }
        if (text) {
          setLinesToCell(cell, [{ t: text, a: align }]);
        } else {
          cell.innerHTML = '';
        }
      });

      const merged = rowObj.__flags && rowObj.__flags.sectionMerged;
      if (merged) {
        const top    = group.querySelector('[data-field="sectionTop"]');
        const bottom = group.querySelector('[data-field="sectionBottom"]');
        const topLines    = getLinesFromCell(top);
        const bottomLines = getLinesFromCell(bottom);
        setLinesToCell(top, [...topLines, ...bottomLines]);
        setLinesToCell(bottom, []);
        group.classList.add('merge-section');
      }
    }
  }

  // デバウンス保存
  let saveTimer = null;
  function scheduleSave(dayKey) {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveRows(dayKey), 250);
  }

  // ========= 右下の「文字揃え」ツールバー =========
  function ensureAlignToolbar() {
    if (document.getElementById('alignToolbar')) return;
    const tb = document.createElement('div');
    tb.id = 'alignToolbar';
