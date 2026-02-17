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

  // ========= 配置（左/中/右）ユーティリティ =========
  // 区間・備考だけ配置を持つ
  const ALIGN_FIELDS = new Set(['sectionTop', 'sectionBottom', 'notes']);

  function applyAlign(cell, align) {
    // クラス
    cell.classList.remove('align-left', 'align-center', 'align-right');
    cell.classList.add(`align-${align}`);
    // インライン（CSSがなくても効くように）
    cell.style.textAlign = (align === 'left') ? 'left' : (align === 'right') ? 'right' : 'center';
    // flex 中央寄せなどに対応するなら justify-content も触る（安全側）
    cell.style.justifyContent = (align === 'left') ? 'flex-start' :
                                (align === 'right') ? 'flex-end'   : 'center';
    // 保存用の明示
    cell.dataset.align = align;
  }

  function getAlign(cell) {
    // 優先：data-align → クラス → インライン → 既定 'center'
    if (cell.dataset.align) return cell.dataset.align;
    if (cell.classList.contains('align-left'))  return 'left';
    if (cell.classList.contains('align-right')) return 'right';
    if (cell.style.textAlign === 'left')  return 'left';
    if (cell.style.textAlign === 'right') return 'right';
    return 'center';
  }

  // ========= 行テンプレ（2段＋ぶち抜き） =========
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

        <!-- 鉦（上下2段）※下段のみ split-top -->
        <div class="cell" style="grid-column:5; grid-row:1;" contenteditable="true" data-field="kaneTop"></div>
        <div class="cell split-top" style="grid-column:5; grid-row:2;" contenteditable="true" data-field="kaneBottom"></div>

        <!-- 笛（上下2段）※下段のみ split-top -->
        <div class="cell" style="grid-column:6; grid-row:1;" contenteditable="true" data-field="fueTop"></div>
        <div class="cell split-top" style="grid-column:6; grid-row:2;" contenteditable="true" data-field="fueBottom"></div>

        <!-- 備考（2段ぶち抜き） -->
        <div class="cell span2" style="grid-column:7; grid-row:1 / span 2;" contenteditable="true" data-field="notes"></div>

        <!-- 行削除（右余白） -->
        <button class="row-del" type="button" title="この行を削除">🗑</button>
      </div>
    `;
  }

  // ========= 保存・復元 =========
  // 区間/備考：{ t, a } で保存（後方互換：文字列も受ける）
  // それ以外：プレーン文字列
  function serializeRows() {
    const rowsEl = $('#rows');
    if (!rowsEl) return [];
    return Array.from(rowsEl.querySelectorAll('.row-group')).map(group => {
      const obj = {};
      group.querySelectorAll('[data-field]').forEach(cell => {
        const field = cell.dataset.field;
        const text = (cell.textContent || '').trim();
        if (ALIGN_FIELDS.has(field)) {
          const a = getAlign(cell);
          obj[field] = { t: text, a };
        } else {
          obj[field] = text;
        }
      });
      return obj;
    });
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
        const field = cell.dataset.field;
        const v = rowObj[field];

        if (ALIGN_FIELDS.has(field)) {
          // {t,a} or 文字列
          if (v && typeof v === 'object') {
            if (v.t) cell.textContent = v.t;
            applyAlign(cell, v.a || 'center');
          } else if (typeof v === 'string') {
            cell.textContent = v;
            applyAlign(cell, 'center');
          } else {
            applyAlign(cell, 'center');
          }
        } else {
          // プレーン
          if (typeof v === 'string') cell.textContent = v;
        }
      });
    }
  }

  function saveRows(dayKey) {
    localStorage.setItem(rowsKey(dayKey), JSON.stringify(serializeRows()));
  }

  // デバウンス保存
  let saveTimer = null;
  function scheduleSave(dayKey) {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveRows(dayKey), 250);
  }

  // ========= 配置ツールバー（セル単位：区間/備考のみ） =========
  function ensureAlignToolbar() {
    if (document.getElementById('alignToolbar')) return;
    const tb = document.createElement('div');
    tb.id = 'alignToolbar';
    tb.className = 'align-toolbar'; // 既存CSSがなくても動作はする
    tb.style.position = 'fixed';
    tb.style.right = '14px';
    tb.style.bottom = '14px';
    tb.style.zIndex = '9999';
    tb.style.display = 'flex';
    tb.style.gap = '8px';
    tb.style.background = '#fff';
    tb.style.border = '1px solid #ddd';
    tb.style.borderRadius = '10px';
    tb.style.padding = '8px';
    tb.style.boxShadow = '0 6px 18px rgba(0,0,0,.12)';
    tb.innerHTML = `
      <button type="button" data-align="left">左</button>
      <button type="button" data-align="center">中</button>
      <button type="button" data-align="right">右</button>
    `;
    document.body.appendChild(tb);
  }

  let selectedCell = null;

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

    // タイトル復元＆編集
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

    // 行復元
    restoreRows(dayKey);

    // 配置ツールバー
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

  // ========= イベント =========
  function initEvents() {
    // クリック（追加・削除・セル選択・配置変更）
    $('#view').addEventListener('click', (e) => {
      const t = (e.target && e.target.nodeType === 3) ? e.target.parentElement : e.target;
      const dayKey = getDayKeyFromHash();

      // セル選択（区間/備考のみ配置可）
      const cell = t.closest('#rows .cell[contenteditable="true"]');
      if (cell && ALIGN_FIELDS.has(cell.dataset.field)) {
        selectedCell = cell;
        // 選択感（任意・最小）：枠線を軽く
        selectedCell.style.outline = '2px solid #0a7cff55';
        selectedCell.style.outlineOffset = '-2px';
      } else if (!t.closest('#alignToolbar')) {
        // セル外クリックで選択解除（ツールバー以外）
        if (selectedCell) {
          selectedCell.style.outline = '';
          selectedCell = null;
        }
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
    });

    // 配置ツールバーのボタン
    document.body.addEventListener('click', (e) => {
      const btn = e.target.closest('#alignToolbar button[data-align]');
      if (!btn) return;
      if (!selectedCell) return;

      const align = btn.dataset.align;
      applyAlign(selectedCell, align);

      const dayKey = getDayKeyFromHash();
      if (dayKey) saveRows(dayKey);
    });

    // 入力 → デバウンス保存（プレーン）
    $('#view').addEventListener('input', (e) => {
      if (!e.target.closest('#rows')) return;
      const dayKey = getDayKeyFromHash();
      if (!dayKey) return;
      scheduleSave(dayKey);
    });

    // Tab/Shift+Tab：次(前)の編集セルへ移動し、全選択
    $('#view').addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;

      const cell = e.target.closest('#rows .cell[contenteditable="true"]');
      if (!cell) return;

      e.preventDefault(); // 既定のフォーカス移動を止める

      const list = Array.from(document.querySelectorAll('#rows .cell[contenteditable="true"]'));
      const i = list.indexOf(cell);
      if (i === -1) return;

      const forward = !e.shiftKey;
      const j = forward ? Math.min(i + 1, list.length - 1) : Math.max(i - 1, 0);
      const next = list[j];
      if (!next) return;

      next.focus();
      setTimeout(() => {
        // 全選択
        const sel = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(next);
        sel.removeAllRanges();
        sel.addRange(range);

        // 選択対象が区間/備考なら選択状態の見た目を更新
        if (ALIGN_FIELDS.has(next.dataset.field)) {
          if (selectedCell) selectedCell.style.outline = '';
          selectedCell = next;
          selectedCell.style.outline = '2px solid #0a7cff55';
          selectedCell.style.outlineOffset = '-2px';
        } else {
          if (selectedCell) { selectedCell.style.outline = ''; selectedCell = null; }
        }

        const dayKey = getDayKeyFromHash();
        if (dayKey) scheduleSave(dayKey);
      }, 0);
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
