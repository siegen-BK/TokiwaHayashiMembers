// 最小のレンダラー（まずはこれだけ）
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

  // 見出し行＋先頭行＋空の rows コンテナを描画
  document.getElementById('view').innerHTML =
    `<section>
        <div class="section-header">
          <button id="btnAddInline" class="btn-add" title="このページに要素を追加">＋ 追加</button>
          <h2 id="sectionTitleHeading" title="クリックで編集">${title}</h2>
        </div>

        <!-- 先頭固定行（見出し） -->
        <div class="first-row-table" role="table" aria-label="固定先頭行（区間・楽器）">
          <div class="cell" role="columnheader">区間・場所</div>
          <div class="cell" role="columnheader">大胴</div>
          <div class="cell" role="columnheader">中胴</div>
          <div class="cell" role="columnheader">側胴</div>
          <div class="cell" role="columnheader">鉦</div>
          <div class="cell" role="columnheader">笛</div>
          <div class="cell" role="columnheader">備考</div>
        </div>

        <!-- データ行の追加先 -->
        <div id="rows" class="rows"></div>
     </section>`;

  // タイトル編集（localStorage）
  const h = document.getElementById('sectionTitleHeading');
  const LS_KEY = `sectionTitle:${key}`;
  const saved = localStorage.getItem(LS_KEY);
  if (saved && saved.trim()) h.textContent = saved.trim();
  h.style.cursor = 'pointer';
  h.addEventListener('click', ()=>{
    const current = localStorage.getItem(LS_KEY) || h.textContent;
    const input = window.prompt('タイトルを入力してください。', current);
    if (input === null) return;
    const next = input.trim();
    if (!next) return;
    localStorage.setItem(LS_KEY, next);
    h.textContent = next;
  });

  -  // 追加ボタン：行を 1 本追加
-  const rowsEl = document.getElementById('rows');
-  document.getElementById('btnAddInline')?.addEventListener('click', ()=>{
-    rowsEl.insertAdjacentHTML('beforeend', rowTemplate());
-  });
}

// 行 1 本（2 段グリッド）のテンプレート
function rowTemplate(){
  return `
    <div class="row-group" role="rowgroup" aria-label="データ行">
      <!-- 区間・場所（上下 2 段） -->
      <div class="cell r1" style="grid-column:1; grid-row:1;"></div>
      <div class="cell r2" style="grid-column:1; grid-row:2;"></div>

      <!-- 大胴／中胴／側胴（2 段ぶち抜き＝鉦の 2 倍の高さ） -->
      <div class="cell span2" style="grid-column:2; grid-row:1 / span 2;"></div>
      <div class="cell span2" style="grid-column:3; grid-row:1 / span 2;"></div>
      <div class="cell span2" style="grid-column:4; grid-row:1 / span 2;"></div>

      <!-- 鉦（上下 2 段） -->
      <div class="cell r1" style="grid-column:5; grid-row:1;"></div>
      <div class="cell r2" style="grid-column:5; grid-row:2;"></div>

      <!-- 笛（上下 2 段） -->
      <div class="cell r1" style="grid-column:6; grid-row:1;"></div>
      <div class="cell r2" style="grid-column:6; grid-row:2;"></div>

      <!-- 備考（2 段ぶち抜き） -->
      <div class="cell span2" style="grid-column:7; grid-row:1 / span 2;"></div>
    </div>
  `;
}
// ルーティング登録と初期化
route('/cover', ()=>renderCover());
route('/section', rest=>renderSection(rest));
navigate();

document.getElementById('view').addEventListener('click', (e)=>{
  const btn = e.target.closest('#btnAddInline');
  if (!btn) return;

  const rowsEl = document.getElementById('rows');
  if (!rowsEl) return;                 // セクション未描画時は無視
  rowsEl.insertAdjacentHTML('beforeend', rowTemplate());
});

// 印刷ボタン
document.getElementById('btnPrint')?.addEventListener('click', ()=>window.print());
