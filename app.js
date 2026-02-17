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

  // ========= 配置（左/中/右） =========
  const ALIGN_FIELDS = new Set(['sectionTop','sectionBottom','notes']);
  function applyAlign(cell, align) {
    cell.classList.remove('align-left','align-center','align-right');
    cell.classList.add(`align-${align}`);
    cell.style.textAlign =
      align === 'left'  ? 'left'  :
      align === 'right' ? 'right' : 'center';
    cell.style.justifyContent =
      align === 'left'  ? 'flex-start' :
      align === 'right' ? 'flex-end'   : 'center';
    cell.dataset.align = align;
  }
  function getAlign(cell) {
    if (cell.dataset.align) return cell.dataset.align;
    if (cell.classList.contains('align-left'))  return 'left';
    if (cell.classList.contains('align-right')) return 'right';
    if (cell.style.textAlign === 'left')  return 'left';
    if (cell.style.textAlign === 'right') return 'right';
    return 'center';
  }

  // ========= 行テンプレ =========
  function rowTemplate() {
    return `
      <div class="row-group" role="rowgroup" aria-label="データ行">
        <!-- 区間・場所（上下2段） -->
        <div class="cell" style="grid-column:1; grid-row:1;" contenteditable="true" data-field="sectionTop"></div>
        <div class="cell" style="grid-column:1; grid-row:2;" contenteditable="true" data-field="sectionBottom"></div>

        <!-- 大胴／中胴／側胴（2段ぶち抜き） -->
        <div class="cell span2" style="grid-column:2; grid-row:1 / span 2;" contenteditable="true" data-field="daido"></div>
        <div class="cell span2" style="grid-column:3; grid-row:1 / span 2;" contenteditable="true" data-field="chudo"></div>
        <div class="cell span2" style="grid-column:4; grid-row:1 / span 2;" contenteditable="true" data-field="sokudo"></div>

        <!-- 鉦（上下2段） -->
        <div class="cell" style="grid-column:5; grid-row:1;" contenteditable="true" data-field="kaneTop"></div>
        <div class="cell split-top" style="grid-column:5; grid-row:2;" contenteditable="true" data-field="kaneBottom"></div>

        <!-- 笛（上下2段） -->
        <div class="cell" style="grid-column:6; grid-row:1;" contenteditable="true" data-field="fueTop"></div>
        <div class="cell split-top" style="grid-column:6; grid-row:2;" contenteditable="true" data-field="fueBottom"></div>

        <!-- 備考（2段ぶち抜き） -->
        <div class="cell span2" style="grid-column:7; grid-row:1 / span 2;" contenteditable="true" data-field="notes"></div>

        <!-- 右外側：ツール | 削除 -->
        <button class="row-tools"  type="button" title="ツール">⋯</button>
        <button class="row-del"    type="button" title="この行を削除">🗑</button>
      </div>
    `;
  }

  // ========= 行間 ⇅ スロット =========
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

  // ========= 保存・復元 =========
  function serializeRows() {
    const rowsEl = $('#rows');
    if (!rowsEl) return [];
    return Array.from(rowsEl.querySelectorAll('.row-group')).map(group => {
      const obj = {};
      group.querySelectorAll('[data-field]').forEach(cell => {
        const field = cell.dataset.field;
        const text = (cell.textContent || '').trim();
        if (ALIGN_FIELDS.has(field)) {
          obj[field] = { t: text, a: getAlign(cell) };
        } else {
          obj[field] = text;
        }
      });
      return obj;
    });
  }
  function saveRows(dayKey) {
    localStorage.setItem(rowsKey(dayKey), JSON.stringify(serializeRows()));
  }
  function restoreRows(dayKey) {
    const rowsEl = $('#rows'); if (!rowsEl) return;
    rowsEl.innerHTML = '';
    const raw = localStorage.getItem(rowsKey(dayKey)); if (!raw) return;
    const data = safeJsonParse(raw, []); if (!Array.isArray(data)) return;

    for (const rowObj of data) {
      rowsEl.insertAdjacentHTML('beforeend', rowTemplate());
      const group = rowsEl.lastElementChild;
      group.querySelectorAll('[data-field]').forEach(cell => {
        const field = cell.dataset.field; const v = rowObj[field];
        if (ALIGN_FIELDS.has(field)) {
          if (v && typeof v === 'object') {
            if (v.t) cell.textContent = v.t;
            applyAlign(cell, v.a || 'center');
          } else if (typeof v === 'string') {
            cell.textContent = v;
            applyAlign(cell, 'center');
          } else {
            applyAlign(cell, 'center');
          }
        } else if (typeof v === 'string') {
          cell.textContent = v;
        }
      });
    }
    rebuildSwapSlots();
  }

  // ========= sticky の top / 高さを算出 =========
  function setStickyOffsets(){
    // タブ（.app-header）高さ
    const appH = document.querySelector('.app-header')?.offsetHeight || 0;

    // ツールバーはタブ直下
    document.documentElement.style.setProperty('--sticky-top-toolbar', `${appH}px`);

    // ツールバー高さ（レイアウト後の実高をCSS変数へ）
    const toolbarEl = document.querySelector('.section-toolbar');
    const toolbarH  = toolbarEl?.offsetHeight || 44;
    document.documentElement.style.setProperty('--toolbar-h', `${toolbarH}px`);

    // 先頭行はタブ＋ツールバー直下
    document.documentElement.style.setProperty('--sticky-top-tablehead', `${appH + toolbarH}px`);
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
        <!-- 左上固定（タブ直下） -->
        <div class="section-toolbar">
          <div class="toolbar-left">
            <div class="align-inline" id="inlineAlign">
              <button type="button" data-align="left"   title="左揃え">左</button>
              <button type="button" data-align="center" title="中央揃え">中</button>
              <button type="button" data-align="right"  title="右揃え">右</button>
            </div>
            <button id="btnAddInline" class="btn-add" type="button" title="このページに要素を追加">＋ 追加</button>
          </div>
          <h2 class="sheet-title" id="sectionTitleHeading" title="クリックで編集">${titleDefault}</h2>
        </div>

        <!-- 先頭行（固定） -->
        <div class="first-row-table" role="table" aria-label="固定先頭行（区間・楽器）">
          <div class="cell" role="columnheader">区間・場所</div>
          <div class="cell" role="columnheader">大胴</div>
          <div class="cell" role="columnheader">中胴</div>
          <div class="cell" role="columnheader">側胴</div>
          <div class="cell" role="columnheader">鉦</div>
          <div class="cell" role="columnheader">笛</div>
          <div class="cell" role="columnheader">備考</div>
        </div>

        <!-- ここから下がスクロール対象 -->
        <div id="rows" class="rows"></div>
      </section>
    `;

    // タイトル復元
    const h = $('#sectionTitleHeading');
    const saved = localStorage.getItem(titleKey(dayKey));
    if (saved && saved.trim()) h.textContent = saved.trim();
    h.style.cursor = 'pointer';
    h.addEventListener('click', () => {
      const current = localStorage.getItem(titleKey(dayKey)) || h.textContent;
      const input = window.prompt('タイトルを入力してください。', current);
      if (input === null) return;
      const next = input.trim(); if (!next) return;
      localStorage.setItem(titleKey(dayKey), next);
      h.textContent = next;
    });

    // 復元＋行間スロット
    restoreRows(dayKey);

    // stickyオフセット算出（マスク帯にも反映）
    setStickyOffsets();
  }

  // ========= ルーティング =========
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

  // ========= イベント =========
  let selectedCell = null;
  function initEvents() {
    // クリック（追加・削除・セル選択・ツール・行間スワップ・配置）
    $('#view').addEventListener('click', (e) => {
      const t = (e.target && e.target.nodeType === 3) ? e.target.parentElement : e.target;
      const dayKey = getDayKeyFromHash();

      // 区間/備考セル選択 → 配置ボタンで変更可
      const cell = t.closest('#rows .cell[contenteditable="true"]');
      if (cell && cell.dataset && ['sectionTop','sectionBottom','notes'].includes(cell.dataset.field)) {
        if (selectedCell) selectedCell.style.outline = '';
        selectedCell = cell;
        selectedCell.style.outline = '2px solid rgba(0,0,0,.3)';
        selectedCell.style.outlineOffset = '-2px';
      } else if (!t.closest('#inlineAlign')) {
        if (selectedCell) { selectedCell.style.outline = ''; selectedCell = null; }
      }

      // 削除
      const del = t.closest('.row-del');
      if (del) {
        e.preventDefault(); e.stopPropagation();
        del.closest('.row-group')?.remove();
        if (dayKey) { saveRows(dayKey); rebuildSwapSlots(); }
        return;
      }

      // ツール（プレースホルダ）
      if (t.closest('.row-tools')) {
        e.preventDefault(); e.stopPropagation();
        return;
      }

      // 行間スワップ
      const swapBtn = t.closest('.swap-slot .row-swap');
      if (swapBtn) {
        e.preventDefault(); e.stopPropagation();
        const rowsEl = $('#rows'); if (!rowsEl || !dayKey) return;
        const slot  = swapBtn.closest('.swap-slot');
        const upper = slot?.previousElementSibling;
        const lower = slot?.nextElementSibling;
        if (!upper || !lower) return;
        if (!upper.classList.contains('row-group')) return;
        if (!lower.classList.contains('row-group')) return;

        const activeField = document.activeElement?.closest('.cell[data-field]')?.dataset?.field || null;
        rowsEl.insertBefore(lower, upper);    // 上下入替
        rebuildSwapSlots();
        if (activeField) lower.querySelector(`.cell[data-field="${activeField}"]`)?.focus();
        saveRows(dayKey);
        return;
      }

      // 追加
      if (t.closest('#btnAddInline')) {
        const rowsEl = $('#rows'); if (!rowsEl || !dayKey) return;
        rowsEl.insertAdjacentHTML('beforeend', rowTemplate());
        rowsEl.lastElementChild?.querySelector('[data-field="sectionTop"]')?.focus();
        saveRows(dayKey); rebuildSwapSlots(); setStickyOffsets();
        return;
      }
    });

    // 書式（左/中/右）
    document.body.addEventListener('click', (e) => {
      const btn = e.target.closest('#inlineAlign button[data-align]'); if (!btn || !selectedCell) return;
      applyAlign(selectedCell, btn.dataset.align);
      const dayKey = getDayKeyFromHash(); if (dayKey) saveRows(dayKey);
    });

    // 入力 → 保存
    $('#view').addEventListener('input', (e) => {
      if (!e.target.closest('#rows')) return;
      const dayKey = getDayKeyFromHash(); if (!dayKey) return;
      clearTimeout(saveTimer); saveTimer = setTimeout(() => saveRows(dayKey), 250);
    });

    // Tab全選択
    $('#view').addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const cell = e.target.closest('#rows .cell[contenteditable="true"]'); if (!cell) return;
      e.preventDefault();
      const list = Array.from(document.querySelectorAll('#rows .cell[contenteditable="true"]'));
      const i = list.indexOf(cell); if (i === -1) return;
      const j = !e.shiftKey ? Math.min(i+1, list.length-1) : Math.max(i-1, 0);
      const next = list[j]; if (!next) return;
      next.focus();
      setTimeout(() => {
        const sel = window.getSelection(), range = document.createRange();
        range.selectNodeContents(next); sel.removeAllRanges(); sel.addRange(range);
        if (['sectionTop','sectionBottom','notes'].includes(next.dataset.field)) {
          if (selectedCell) selectedCell.style.outline = '';
          selectedCell = next;
          selectedCell.style.outline = '2px solid rgba(0,0,0,.3)';
          selectedCell.style.outlineOffset = '-2px';
        } else {
          if (selectedCell) { selectedCell.style.outline = ''; selectedCell = null; }
        }
      }, 0);
    });

    // リサイズでstickyオフセット再計算
    window.addEventListener('resize', setStickyOffsets);
  }

  // デバウンス保存
  let saveTimer = null;

  // ========= ルート起動 =========
  function initRouting() {
    if (typeof window.route !== 'function' || typeof window.navigate !== 'function') {
      $('#view').textContent = 'router.js の読み込みに失敗しました'; return;
    }
    window.route('/cover',   () => renderCover());
    window.route('/section', (rest) => renderSection(rest));
    window.route('/404',     () => { $('#view').textContent = '404'; });
    if (!location.hash) location.hash = '#/cover';
    window.navigate();
  }

  document.addEventListener('DOMContentLoaded', () => {
    initRouting(); initEvents();
  });
})();
