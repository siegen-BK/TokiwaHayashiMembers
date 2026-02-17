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
  let enterCloneAlign = null; // Enter時の継承揃え
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

  function setLineAlign(ln, align) {
    ln.classList.remove('align-left','align-center','align-right');
    ln.classList.add(`align-${align}`);
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
    tb.className = 'align-toolbar hidden';
    tb.innerHTML = `
      <button type="button" data-align="left">左</button>
      <button type="button" data-align="center">中</button>
      <button type="button" data-align="right">右</button>
    `;
    document.body.appendChild(tb);
  }

  // ========= 描画 =========
  function renderCover() {
    $('#view').innerHTML = '<section><h2>表紙</h2></section>';
  }

  function renderSection(rest) {
    const dayKey = (rest || DEFAULT_DAY).toLowerCase();
    const titleDefault = TITLE_BY_DAY[dayKey] || TITLE_BY_DAY[DEFAULT_DAY];

    $('#view').innerHTML = `
      <section>
        <div class="section-header">
          <button id="btnAddInline" class="btn-add" type="button" title="このページに要素を追加">＋ 追加</button>
          <h2 id="sectionTitleHeading" title="クリックで編集">${titleDefault}</h2>
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

    const h = $('#sectionTitleHeading');
    const saved = localStorage.getItem(titleKey(dayKey));
    if (saved && saved.trim()) h.textContent = saved.trim();

    h.style.cursor = 'pointer';
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
    ensureAlignToolbar();
  }

  // ========= ルーティング初期化 =========
  function initRouting() {
    if (typeof window.route !== 'function' || typeof window.navigate !== 'function') {
      $('#view').textContent = 'router.js の読み込みに失敗しました';
      return;
    }
    window.route('/cover',   () => renderCover());
    window.route('/section', (rest) => renderSection(rest));
    window.route('/404',     () => { $('#view').textContent = '404'; });
    if (!location.hash) location.hash = '#/cover';
    window.navigate();
  }

  // ========= IME 変換フラグ =========
  let isComposing = false;

  // ========= クリック＆入力（委譲1本） =========
  let selectedLine = null;

  function initEvents() {
    // --- IME 変換開始/終了 ---
    $('#view').addEventListener('compositionstart', () => { isComposing = true; });
    $('#view').addEventListener('compositionend', (e) => {
      isComposing = false;
      const cell = e.target.closest(EDITABLE_LN_SEL);
      const dayKey = getDayKeyFromHash && getDayKeyFromHash();
      if (!cell || !dayKey) return;
      if (cell.querySelector('.ln')) rebuildLines(cell);
      else normalizeLines(cell);
      saveRows(dayKey);
    });

    // --- Enter（区間/備考 .ln）：自前改行 → 新行末尾へ ---
    $('#view').addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || isComposing) return;
      const cell = e.target.closest(EDITABLE_LN_SEL);
      if (!cell) return;

      e.preventDefault();                // 既定の改行を止める
      normalizeLines(cell);              // .ln 構造がなければ作る

      const curLn = getCurrentLineInCell(cell) || cell.querySelector('.ln');
      if (!curLn) return;

      const align =
        curLn.classList.contains('align-right') ? 'right' :
        curLn.classList.contains('align-left')  ? 'left'  : 'center';

      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);

      const newLn = document.createElement('span');
      newLn.className = `ln align-${align}`;
      newLn.appendChild(document.createElement('br'));

      const endRange = document.createRange();
      endRange.selectNodeContents(curLn);
      endRange.collapse(false);
      const atEnd = range.compareBoundaryPoints(Range.END_TO_END, endRange) === 0;

      if (atEnd) {
        curLn.parentNode.insertBefore(newLn, curLn.nextSibling);
      } else {
        const after = document.createRange();
        after.setStart(range.endContainer, range.endOffset);
        after.setEnd(curLn, curLn.childNodes.length);
        const frag = after.extractContents();
        newLn.innerHTML = '';
        newLn.appendChild(frag);
        curLn.parentNode.insertBefore(newLn, curLn.nextSibling);
        if (!curLn.textContent) curLn.appendChild(document.createElement('br'));
      }

      placeCaretAtEnd(newLn);
      skipNextRebuild = true;

      const dayKey = getDayKeyFromHash && getDayKeyFromHash();
      if (dayKey) saveRows(dayKey);
    });

    // --- 単行セルの Enter：改行禁止 → 末尾へ ---
    $('#view').addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || isComposing) return;
      const cell = e.target.closest(
        '#rows .cell[contenteditable="true"]:not([data-field="sectionTop"]):not([data-field="sectionBottom"]):not([data-field="notes"])'
      );
      if (!cell) return;
      e.preventDefault();
      placeCaretAtEnd(cell);
      const dayKey = getDayKeyFromHash && getDayKeyFromHash();
      if (dayKey) scheduleSave(dayKey);
    });

    // --- Tab / Shift+Tab：次(前)セルへ移動し全選択 ---
    $('#view').addEventListener('keydown', (e) => {
      if (e.key !== 'Tab' || isComposing) return;
      const cell = e.target.closest(EDITABLE_ALL_SEL);
      if (!cell) return;

      e.preventDefault();

      const next = findSiblingEditableCell(cell, /*forward*/ !e.shiftKey);
      if (!next) return;

      next.focus();
      setTimeout(() => {
        if (next.matches(EDITABLE_LN_SEL) && !next.querySelector('.ln')) {
          normalizeLines(next);
        }
        selectAllInCell(next);
        const dayKey = getDayKeyFromHash && getDayKeyFromHash();
        if (dayKey) scheduleSave(dayKey);
      }, 0);
    });

    // クリック（追加・削除・区間結合・行選択）
    $('#view').addEventListener('click', (e) => {
      const t = (e.target && e.target.nodeType === 3) ? e.target.parentElement : e.target;
      const dayKey = getDayKeyFromHash();

      // 区間/備考セル → 行選択＆ツールバー表示
      const editable = t.closest(EDITABLE_LN_SEL);
      if (editable) {
        normalizeLines(editable);
        const ln = getCurrentLineInCell(editable) || editable.querySelector('.ln');
        if (selectedLine) selectedLine.classList.remove('is-selected');
        selectedLine = ln;
        if (selectedLine) selectedLine.classList.add('is-selected');
        const tb = document.getElementById('alignToolbar');
        if (tb) tb.classList.remove('hidden');
        return;
      }

      // 区間 結合/解除
      const mergeBtn = t.closest('.row-merge');
      if (mergeBtn) {
        e.preventDefault();
        e.stopPropagation();

        const group  = mergeBtn.closest('.row-group');
        const top    = group.querySelector('[data-field="sectionTop"]');
        const bottom = group.querySelector('[data-field="sectionBottom"]');

        const mergedNow = group.classList.toggle('merge-section');

        if (mergedNow) {
          const topLines    = getLinesFromCell(top);
          const bottomLines = getLinesFromCell(bottom);
          setLinesToCell(top, [...topLines, ...bottomLines]);
          setLinesToCell(bottom, []);
        } else {
          const lines = getLinesFromCell(top);
          const first = lines[0] ? [lines[0]] : [];
          const rest  = lines.slice(1);
          setLinesToCell(top, first);
          setLinesToCell(bottom, rest);
        }

        if (dayKey) saveRows(dayKey);
        return;
      }

      // 行削除
      const del = t.closest('.row-del');
      if (del) {
        e.preventDefault();
        e.stopPropagation();
        del.closest('.row-group')?.remove();
        if (dayKey) saveRows(dayKey);
        return;
      }

      // 行追加
      const add = t.closest('#btnAddInline');
      if (add) {
        const rowsEl = $('#rows');
        if (!rowsEl || !dayKey) return;
        rowsEl.insertAdjacentHTML('beforeend', rowTemplate());
        const last = rowsEl.lastElementChild;
        last?.querySelector('[data-field="sectionTop"]')?.focus();
        saveRows(dayKey);
        return;
      }

      // ツールバー閉じる
      if (!t.closest('#alignToolbar')) {
        const tb = document.getElementById('alignToolbar');
        if (tb) tb.classList.add('hidden');
        if (selectedLine) selectedLine.classList.remove('is-selected');
        selectedLine = null;
      }
    });

    // 入力（contenteditable） → 行ラップ再構成＋保存
    $('#view').addEventListener('input', (e) => {
      if (isComposing) return;

      const cell = e.target.closest(EDITABLE_LN_SEL);
      const dayKey = getDayKeyFromHash();
      if (!cell || !dayKey) return;

      // Enter直後はrebuildをスキップ（キャレット維持）
      if (skipNextRebuild) {
        skipNextRebuild = false;
        scheduleSave(dayKey);
        return;
      }

      if (cell.querySelector('.ln')) rebuildLines(cell);
      else normalizeLines(cell);

      scheduleSave(dayKey);
    });

    // 右下ツールバー：左/中/右
    document.body.addEventListener('click', (e) => {
      const btn = e.target.closest('#alignToolbar button[data-align]');
      if (!btn || !selectedLine) return;
      const align = btn.dataset.align;
      setLineAlign(selectedLine, align);
      const dayKey = getDayKeyFromHash();
      if (dayKey) saveRows(dayKey);
    });

    // 印刷
    document.getElementById('btnPrint')?.addEventListener('click', () => window.print());
  }

  // ========= 起動 =========
  document.addEventListener('DOMContentLoaded', () => {
    initRouting();
    initEvents();
  });
})();
