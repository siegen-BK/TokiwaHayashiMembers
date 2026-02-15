// ===== レンダラー =====
function renderCover(){
  document.getElementById('view').innerHTML =
    '<section><h2>表紙</h2></section>';
}

function renderSection(id){
  const key = (id || 'd1').toLowerCase();
  const title =
    key === 'd1' ? '2026年11月3日(月･祝)' :
    key === 'd2' ? '2026年11月4日(火)' :
                   '2026年11月5日(水)';

  document.getElementById('view').innerHTML =
    `<section>
        <div class="section-header">
          <button id="btnAddInline" class="btn-add" title="このページに要素を追加">＋ 追加</button>
          <h2 id="sectionTitleHeading" title="クリックで編集">${title}</h2>
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
     </section>`;

  // ---- タイトル編集（localStorage） ----
  const h = document.getElementById('sectionTitleHeading');
  const TITLE_KEY = `sectionTitle:${key}`;
  const savedTitle = localStorage.getItem(TITLE_KEY);
  if (savedTitle && savedTitle.trim()) h.textContent = savedTitle.trim();

  h.style.cursor = 'pointer';
  h.addEventListener('click', ()=>{
    const current = localStorage.getItem(TITLE_KEY) || h.textContent;
    const input = window.prompt('タイトルを入力してください。', current);
    if (input === null) return;
    const next = input.trim();
    if (!next) return;
    localStorage.setItem(TITLE_KEY, next);
    h.textContent = next;
  });

  // ---- 行データを復元 ----
  restoreRows(key);
}

// ===== 行テンプレ（編集可能：contenteditable + data-field） =====
function rowTemplate(){
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

      <button class="row-del" type="button" title="この行を削除">🗑</button>
    </div>
  `;
}

// ===== 保存・復元 =====
function rowsStorageKey(dayKey){ return `rows:${dayKey}`; }

function serializeRows(dayKey){
  const rowsEl = document.getElementById('rows');
  if (!rowsEl) return [];

  const groups = Array.from(rowsEl.querySelectorAll('.row-group'));
  return groups.map(g=>{
    const obj = {};
    g.querySelectorAll('[data-field]').forEach(cell=>{
      obj[cell.dataset.field] = (cell.textContent || '').trim();
    });
    return obj;
  });
}

function saveRows(dayKey){
  const data = serializeRows(dayKey);
  localStorage.setItem(rowsStorageKey(dayKey), JSON.stringify(data));
}

function restoreRows(dayKey){
  const rowsEl = document.getElementById('rows');
  if (!rowsEl) return;

  rowsEl.innerHTML = '';
  const raw = localStorage.getItem(rowsStorageKey(dayKey));
  if (!raw) return;

  let data;
  try { data = JSON.parse(raw); } catch { data = []; }
  if (!Array.isArray(data)) return;

  data.forEach(rowObj=>{
    rowsEl.insertAdjacentHTML('beforeend', rowTemplate());
    const g = rowsEl.lastElementChild;
    g.querySelectorAll('[data-field]').forEach(cell=>{
      const v = rowObj[cell.dataset.field];
      if (v) cell.textContent = v;
    });
  });
}

// ===== ルーティング登録と初期化 =====
route('/cover', ()=>renderCover());
route('/section', rest=>renderSection(rest));

if (!location.hash) location.hash = '#/cover';
navigate();

// ===== 追加・編集イベント（委譲・デバウンス保存） =====
let saveTimer = null;
function scheduleSave(){
  const hash = location.hash || '';
  const parts = hash.split('/');
  if (parts[1] !== 'section') return;
  const dayKey = (parts[2] || 'd1').toLowerCase();

  clearTimeout(saveTimer);
  saveTimer = setTimeout(()=>saveRows(dayKey), 250);
}

document.getElementById('view').addEventListener('click', (e)=>{
  const btn = e.target.closest('#btnAddInline');
  if (!btn) return;

  const hash = location.hash || '';
  const parts = hash.split('/');
  const dayKey = (parts[2] || 'd1').toLowerCase();

  const rowsEl = document.getElementById('rows');
  if (!rowsEl) return;

  rowsEl.insertAdjacentHTML('beforeend', rowTemplate());
  saveRows(dayKey); // 追加直後は即保存
});

// セル編集を拾って保存（入力・貼り付け・IME確定を拾える）
document.getElementById('view').addEventListener('input', (e)=>{
  if (!e.target.closest('#rows')) return;
  scheduleSave();
});

// ===== 印刷 =====
document.getElementById('btnPrint')?.addEventListener('click', ()=>window.print());
