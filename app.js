(() => {
  const STORAGE_PREFIX = 'membersApp:';
  const DEFAULT_DAY = 'd1';
  const TITLE_BY_DAY = {
    d1: '2026年11月3日(月･祝)',
    d2: '2026年11月4日(火)',
    d3: '2026年11月5日(水)',
  };
  const MEMBERS_KEY = `${STORAGE_PREFIX}members`;
  const ALIGN_FIELDS = new Set(['sectionTop','sectionBottom','notes']);

  const $ = (sel, root = document) => root.querySelector(sel);
  const safeJsonParse = (t, f) => { try { return JSON.parse(t); } catch { return f; } };
  const titleKey = (k) => `${STORAGE_PREFIX}title:${k}`;
  const rowsKey  = (k) => `${STORAGE_PREFIX}rows:${k}`;

  function getDayKeyFromHash() {
    const parts = (location.hash || '').split('/');
    if (parts[1] !== 'section') return null;
    const k = (parts[2] || DEFAULT_DAY).toLowerCase();
    return TITLE_BY_DAY[k] ? k : DEFAULT_DAY;
  }

  // 表示のズレを直す計算
  function updateStickyLayout() {
    const header = $('.app-header');
    const toolbar = $('.section-toolbar');
    if (!header) return;
    const hHeight = header.offsetHeight;
    document.documentElement.style.setProperty('--sticky-top-toolbar', `${hHeight}px`);
    if (toolbar) {
      const tHeight = toolbar.offsetHeight;
      document.documentElement.style.setProperty('--toolbar-h', `${tHeight}px`);
      document.documentElement.style.setProperty('--sticky-top-tablehead', `${hHeight + tHeight}px`);
    }
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
    if (!dayKey) return;
    localStorage.setItem(rowsKey(dayKey), JSON.stringify(serializeRows()));
  }

  let saveTimer = null;
  function scheduleSave(dayKey) {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveRows(dayKey), 250);
  }

  function applyAlign(cell, align) {
    cell.dataset.align = align;
    cell.style.textAlign = align;
    cell.style.justifyContent = align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center';
  }

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
        <button class="row-tools" type="button">⋯</button>
        <button class="row-del" type="button">🗑</button>
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
    const savedTitle = localStorage.getItem(titleKey(dayKey));
    if (savedTitle) h.textContent = savedTitle;
    h.onclick = () => {
      const input = prompt('タイトル編集', h.textContent);
      if (input) { localStorage.setItem(titleKey(dayKey), input); h.textContent = input; }
    };

    const rowsEl = $('#rows');
    const data = safeJsonParse(localStorage.getItem(rowsKey(dayKey)), []);
    data.forEach(rowObj => {
      rowsEl.insertAdjacentHTML('beforeend', rowTemplate());
      const group = rowsEl.lastElementChild;
      group.querySelectorAll('[data-field]').forEach(cell => {
        const field = cell.dataset.field;
        const v = rowObj[field];
        if (ALIGN_FIELDS.has(field) && v && typeof v === 'object') {
          cell.textContent = v.t;
          applyAlign(cell, v.a);
        } else {
          cell.textContent = v || '';
        }
      });
    });

    rebuildSwapSlots();
    setTimeout(updateStickyLayout, 0);
  }

  let selectedCell = null;
  function initEvents() {
    window.addEventListener('resize', updateStickyLayout);
    $('#view').addEventListener('click', (e) => {
      const t = e.target;
      const dayKey = getDayKeyFromHash();
      if (t.closest('#btnAddInline')) {
        $('#rows').insertAdjacentHTML('beforeend', rowTemplate());
        rebuildSwapSlots(); saveRows(dayKey); return;
      }
      const delBtn = t.closest('.row-del');
      if (delBtn) {
        delBtn.closest('.row-group').remove();
        rebuildSwapSlots(); saveRows(dayKey); return;
      }
      const swapBtn = t.closest('.row-swap');
      if (swapBtn) {
        const slot = swapBtn.closest('.swap-slot');
        const upper = slot.previousElementSibling;
        const lower = slot.nextElementSibling;
        if (upper && lower) { lower.after(upper); rebuildSwapSlots(); saveRows(dayKey); }
        return;
      }
      const cell = t.closest('#rows .cell[contenteditable="true"]');
      if (cell) {
        if (selectedCell) selectedCell.style.outline = '';
        selectedCell = cell;
        selectedCell.style.outline = '2px solid #000';
      }
      const alignBtn = t.closest('#inlineAlign button');
      if (alignBtn && selectedCell) {
        applyAlign(selectedCell, alignBtn.dataset.align);
        saveRows(dayKey);
      }
    });
    $('#view').addEventListener('input', (e) => {
      const dayKey = getDayKeyFromHash();
      if (dayKey) scheduleSave(dayKey);
    });
    document.getElementById('btnPrint')?.addEventListener('click', () => window.print());
  }

  window.route('/cover', () => { $('#view').innerHTML = '<h2>表紙</h2>'; updateStickyLayout(); });
  window.route('/section', (rest) => renderSection(rest));
  window.route('/members', () => { $('#view').innerHTML = '<h2>メンバー管理</h2>'; updateStickyLayout(); });

  document.addEventListener('DOMContentLoaded', () => {
    initEvents();
    window.navigate(); 
  });
})();
