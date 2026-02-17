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

  function titleKey(dayKey) { return `${STORAGE_PREFIX}title:${dayKey}`; }
  function rowsKey(dayKey)  { return `${STORAGE_PREFIX}rows:${dayKey}`; }

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

        <!-- 行削除 -->
        <button class="row-del" type="button" title="この行を削除">🗑</button>
      </div>
    `;
  }

  // ========= Line（行）ユーティリティ =========
  // .cell 内を <span class="ln"> 行 にラップ（初回のみ・既に .ln があれば触らない）
  function normalizeLines(cell) {
    if (cell.querySelector('.ln')) return; // 既に行ラップ済みなら何もしない
    const raw = cell.innerText.replace(/\r/g, '');
    const lines = raw.split('\n');
    const html = lines.map(s => {
      const esc = s
        .replace(/&/g,'&amp;')
        .replace(/</g,'&lt;')
        .replace(/>/g,'&gt;');
      // 初期は中央揃え
      return `<span class="ln align-center">${esc}</span>`;
    }).join('');
    cell.innerHTML = html;
  }

  // 既存 .ln の align をできるだけ保持しつつ、cell.innerText を行ラップに再構成
  const _rebuildingCells = new WeakSet();
  function rebuildLines(cell) {
    if (_rebuildingCells.has(cell)) return;
    _rebuildingCells.add(cell);

    const prevAligns = Array.from(cell.querySelectorAll('.ln')).map(ln => {
      if (ln.classList.contains('align-left')) return 'left';
      if (ln.classList.contains('align-right')) return 'right';
      return 'center';
    });

    const text = cell.innerText.replace(/\r/g,'');
    const lines = text.split('\n');
    const html = lines.map((s,i) => {
      const a = prevAligns[i] || 'center';
      const esc = s
        .replace(/&/g,'&amp;')
        .replace(/</g,'&lt;')
        .replace(/>/g,'&gt;');
      return `<span class="ln align-${a}">${esc}</span>`;
    }).join('');
    cell.innerHTML = html;

    _rebuildingCells.delete(cell);
  }

  // キャレット位置から現在 .ln を取得
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

  // ========= 保存・復元 =========
  // 形式：
  // - 新形式：{ lines:[ {t:'文字', a:'left|center|right'}, ... ] }
  // - 旧形式：{ t:'文字', a:'...' } または '文字列'
  function serializeRows() {
    const rowsEl = $('#rows');
    if (!rowsEl) return [];
    return Array.from(rowsEl.querySelectorAll('.row-group')).map(group => {
      const obj = {};
      group.querySelectorAll('[data-field]').forEach(cell => {
        const lns = cell.querySelectorAll('.ln');
        if (lns.length) {
          obj[cell.dataset.field] = {
            lines: Array.from(lns).map(ln => ({
              t: (ln.textContent || '').trim(),
              a: ln.classList.contains('align-left') ? 'left' :
                 ln.classList.contains('align-right') ? 'right' : 'center'
            }))
          };
        } else {
          // .ln が無いセルは従来形式で保存
          const text = (cell.textContent || '').trim();
          const align =
            cell.classList.contains('align-left') ? 'left' :
            cell.classList.contains('align-right') ? 'right' : 'center';
          obj[cell.dataset.field] = { t: text, a: align };
        }
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
    if (!raw) return;

    const data = safeJsonParse(raw, []);
    if (!Array.isArray(data)) return;

    for (const rowObj of data) {
      rowsEl.insertAdjacentHTML('beforeend', rowTemplate());
      const group = rowsEl.lastElementChild;

      group.querySelectorAll('[data-field]').forEach(cell => {
        const v = rowObj[cell.dataset.field];

        // 1) 新形式：行配列
        if (v && Array.isArray(v.lines)) {
          const html = v.lines.map(item => {
            const t = (item.t || '')
              .replace(/&/g,'&amp;')
              .replace(/</g,'&lt;')
              .replace(/>/g,'&gt;');
            const a = item.a || 'center';
            return `<span class="ln align-${a}">${t}</span>`;
          }).join('');
          cell.innerHTML = html;
          return;
        }

        // 2) 旧形式：単一テキスト＋セル揃え or 純文字列
        let text = '';
        let align = 'center';
        if (typeof v === 'string') {
          text = v;
        } else if (v && typeof v === 'object') {
          text  = v.t || '';
          align = v.a || 'center';
        }

        if (text) {
          const esc = text
            .replace(/&/g,'&amp;')
            .replace(/</g,'&lt;')
            .replace(/>/g,'&gt;');
          cell.innerHTML = `<span class="ln align-${align}">${esc}</span>`;
        } else {
          cell.innerHTML = '';
        }
      });
    }
  }

  // デバウンス保存（入力頻度が高いので軽く間引く）
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

    // 行データ復元
    restoreRows(dayKey);

    // ツールバー用DOMを1回だけ用意
    ensureAlignToolbar();
  }

  // ========= ルーティング初期化 =========
  function initRouting() {
    // router.js が window.route / window.navigate を公開している前提
    if (typeof window.route !== 'function' || typeof window.navigate !== 'function') {
      $('#view').textContent = 'router.js の読み込みに失敗しました';
      return;
    }

    window.route('/cover', () => renderCover());
    window.route('/section', (rest) => renderSection(rest));
    window.route('/404', () => { $('#view').textContent = '404'; });

    if (!location.hash) location.hash = '#/cover';
    window.navigate();
  }

  // ========= クリック＆入力（委譲1本） =========
  let selectedLine = null; // 現在選択中の .ln

  function initEvents() {
    // クリック（追加・削除・行選択）
    $('#view').addEventListener('click', (e) => {
      const t = (e.target && e.target.nodeType === 3) ? e.target.parentElement : e.target;
      const dayKey = getDayKeyFromHash();

      // 1) 区間/備考セル内でクリック → 行選択＆ツールバー表示
      const targetEditableCell = t.closest(
        '#rows .cell[contenteditable="true"][data-field="sectionTop"], ' +
        '#rows .cell[contenteditable="true"][data-field="sectionBottom"], ' +
        '#rows .cell[contenteditable="true"][data-field="notes"]'
      );
      if (targetEditableCell) {
        // 初回は行ラップを作る
        normalizeLines(targetEditableCell);

        // 現在キャレットの行を選択
        const ln = getCurrentLineInCell(targetEditableCell) || targetEditableCell.querySelector('.ln');
        if (selectedLine) selectedLine.classList.remove('is-selected');
        selectedLine = ln;
        if (selectedLine) selectedLine.classList.add('is-selected');

        // ツールバー表示
        const tb = document.getElementById('alignToolbar');
        if (tb) tb.classList.remove('hidden');

        return;
      }

      // 2) 行削除
      const del = t.closest('.row-del');
      if (del) {
        e.preventDefault();
        e.stopPropagation();
        del.closest('.row-group')?.remove();
        if (dayKey) saveRows(dayKey);
        return;
      }

      // 3) 行追加
      const add = t.closest('#btnAddInline');
      if (add) {
        const rowsEl = $('#rows');
        if (!rowsEl || !dayKey) return;
        rowsEl.insertAdjacentHTML('beforeend', rowTemplate());

        // 追加した行の最初セルへフォーカス
        const last = rowsEl.lastElementChild;
        last?.querySelector('[data-field="sectionTop"]')?.focus();

        saveRows(dayKey);
        return;
      }

      // 4) その他をクリック → ツールバーを隠す＆選択解除
      if (!t.closest('#alignToolbar')) {
        const tb = document.getElementById('alignToolbar');
        if (tb) tb.classList.add('hidden');
        if (selectedLine) selectedLine.classList.remove('is-selected');
        selectedLine = null;
      }
    });

    // 入力（contenteditable） → 行ラップ再構成＋保存
    $('#view').addEventListener('input', (e) => {
      const cell = e.target.closest(
        '#rows .cell[contenteditable="true"][data-field="sectionTop"], ' +
        '#rows .cell[contenteditable="true"][data-field="sectionBottom"], ' +
        '#rows .cell[contenteditable="true"][data-field="notes"]'
      );
      const dayKey = getDayKeyFromHash();
      if (!cell || !dayKey) return;

      // .ln が無ければ作成、あれば align を保持して再構成
      if (cell.querySelector('.ln')) {
        rebuildLines(cell);
      } else {
        normalizeLines(cell);
      }

      scheduleSave(dayKey);
    });

    // 右下ツールバーで「左/中/右」を適用
    document.body.addEventListener('click', (e) => {
      const btn = e.target.closest('#alignToolbar button[data-align]');
      if (!btn) return;
      if (!selectedLine) return;

      const align = btn.dataset.align;
      setLineAlign(selectedLine, align);

      // 即保存
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
