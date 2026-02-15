(() => {
  // =========================
  // 設定（必要ならここだけ調整）
  // =========================
  const STORAGE_PREFIX = 'membersApp:'; // localStorageキーの接頭辞
  const DEFAULT_SECTION = 'd1';

  const TITLE_BY_DAY = {
    d1: '2026年11月3日(月･祝)',
    d2: '2026年11月4日(火)',
    d3: '2026年11月5日(水)'
  };

  // =========================
  // ユーティリティ
  // =========================
  const $ = (sel, root = document) => root.querySelector(sel);

  function getDayKeyFromHash() {
    const hash = location.hash || '';
    const parts = hash.split('/'); // ['#','section','d1']
    if (parts[1] !== 'section') return null;
    const k = (parts[2] || DEFAULT_SECTION).toLowerCase();
    return (k === 'd1' || k === 'd2' || k === 'd3') ? k : DEFAULT_SECTION;
  }

  function titleStorageKey(dayKey) {
    return `${STORAGE_PREFIX}title:${dayKey}`;
  }

  function rowsStorageKey(dayKey) {
    return `${STORAGE_PREFIX}rows:${dayKey}`;
  }

  function safeParseJSON(text, fallback) {
    try { return JSON.parse(text); } catch { return fallback; }
  }

  // =========================
  // テンプレート（行）
  // =========================
  function rowTemplate() {
    // 区間・場所 / 鉦 / 笛 = 2段
    // 大胴〜側胴 / 備考 = 2段ぶち抜き（span2）
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
        <div class="cell" style="grid-column:5; grid-row:2;" contenteditable="true" data-field="kaneBottom"></div>

        <!-- 笛（上下2段） -->
        <div class="cell" style="grid-column:6; grid-row:1;" contenteditable="true" data-field="fueTop"></div>
        <div class="cell" style="grid-column:6; grid-row:2;" contenteditable="true" data-field="fueBottom"></div>

        <!-- 備考（2段ぶち抜き） -->
        <div class="cell span2" style="grid-column:7; grid-row:1 / span 2;" contenteditable="true" data-field="notes"></div>

        <!-- 行削除（右余白に出すCSS想定） -->
        <button class="row-del" type="button" title="この行を削除">🗑</button>
      </div>
    `;
  }

  // =========================
  // 保存・復元
  // =========================
  function serializeRows() {
    const rowsEl = $('#rows');
    if (!rowsEl) return [];
    return Array.from(rowsEl.querySelectorAll('.row-group')).map(g => {
      const obj = {};
      g.querySelectorAll('[data-field]').forEach(cell => {
        obj[cell.dataset.field] = (cell.textContent || '').trim();
      });
      return obj;
    });
  }

  function saveRows(dayKey) {
    const data = serializeRows();
    localStorage.setItem(rowsStorageKey(dayKey), JSON.stringify(data));
  }

  function restoreRows(dayKey) {
    const rowsEl = $('#rows');
    if (!rowsEl) return;

    rowsEl.innerHTML = '';
    const raw = localStorage.getItem(rowsStorageKey(dayKey));
    if (!raw) return;

    const data = safeParseJSON(raw, []);
    if (!Array.isArray(data)) return;

    data.forEach(rowObj => {
      rowsEl.insertAdjacentHTML('beforeend', rowTemplate());
      const g = rowsEl.lastElementChild;
      g.querySelectorAll('[data-field]').forEach(cell => {
        const v = rowObj[cell.dataset.field];
        if (v) cell.textContent = v;
      });
    });
  }

  // 入力保存（デバウンス）
  let saveTimer = null;
  function scheduleSave(dayKey) {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveRows(dayKey), 250);
  }

  // =========================
  // 画面描画
  // =========================
  function renderCover() {
    $('#view').innerHTML = '<section><h2>表紙</h2></section>';
  }

  function renderSection(dayKey) {
    const titleDefault = TITLE_BY_DAY[dayKey] || TITLE_BY_DAY[DEFAULT_SECTION];

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

    // タイトル復元
    const h = $('#sectionTitleHeading');
    const savedTitle = localStorage.getItem(titleStorageKey(dayKey));
    if (savedTitle && savedTitle.trim()) h.textContent = savedTitle.trim();

    // タイトル編集（クリック）
    h.style.cursor = 'pointer';
    h.addEventListener('click', () => {
      const current = localStorage.getItem(titleStorageKey(dayKey)) || h.textContent;
      const input = window.prompt('タイトルを入力してください。', current);
      if (input === null) return;
      const next = input.trim();
      if (!next) return;
      localStorage.setItem(titleStorageKey(dayKey), next);
      h.textContent = next;
    });

    // 行を復元
    restoreRows(dayKey);
  }

  // =========================
  // ルーティング（router.jsが用意する前提）
  // =========================
  function initRouting() {
    if (typeof window.route !== 'function' || typeof window.navigate !== 'function') {
      // router.js 側が未準備ならここで止める（静かに失敗させない）
      $('#view').textContent = 'router.js が読み込まれていません';
      return;
    }

    window.route('/cover', () => renderCover());
    window.route('/section', (rest) => renderSection((rest || DEFAULT_SECTION).toLowerCase()));
    window.route('/404', () => { $('#view').textContent = '404'; });

    // 初回ハッシュなし対策
    if (!location.hash) location.hash = '#/cover';

    window.navigate();
  }

  // =========================
  // イベント（ここ1本に集約）
  // =========================
  function initEvents() {
    // クリック（追加・削除）
    $('#view').addEventListener('click', (e) => {
      const t = (e.target && e.target.nodeType === 3) ? e.target.parentElement : e.target;
      const dayKey = getDayKeyFromHash();

      // 削除
      const del = t.closest('.row-del');
      if (del) {
        e.preventDefault();
        e.stopPropagation();
        const row = del.closest('.row-group');
        if (row) row.remove();
        if (dayKey) saveRows(dayKey);
        return;
      }

      // 追加
      const add = t.closest('#btnAddInline');
      if (add) {
        const rowsEl = $('#rows');
        if (!rowsEl || !dayKey) return;
        rowsEl.insertAdjacentHTML('beforeend', rowTemplate());

        // 追加直後に一番左上へフォーカス（任意）
        const last = rowsEl.lastElementChild;
        const firstCell = last?.querySelector('[data-field="sectionTop"]');
        firstCell?.focus();

        saveRows(dayKey);
        return;
      }
    });

    // 入力（contenteditable 保存）
    $('#view').addEventListener('input', (e) => {
      if (!e.target.closest('#rows')) return;
      const dayKey = getDayKeyFromHash();
      if (!dayKey) return;
      scheduleSave(dayKey);
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
