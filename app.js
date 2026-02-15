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

  // 見出し行（左に「＋追加」、右にタイトル）＋ 固定の先頭行
  document.getElementById('view').innerHTML =
    `<section>
        <div class="section-header">
          <button id="btnAddInline" class="btn-add" title="このページに要素を追加">＋ 追加</button>
          <h2 id="sectionTitleHeading" title="クリックで編集">${title}</h2>
        </div>

        
<!-- 固定の先頭行（罫線つき 1 行テーブル） -->
        <div class="first-row-table" role="table" aria-label="固定先頭行（区間・担当）">
          <div class="cell" role="columnheader">区間・場所</div>
          <div class="cell" role="columnheader">大胴</div>
          <div class="cell" role="columnheader">中胴</div>
          <div class="cell" role="columnheader">側胴</div>
          <div class="cell" role="columnheader">鉦</div>
          <div class="cell" role="columnheader">笛</div>
          <div class="cell" role="columnheader">備考</div>
        </div>

     </section>`;

  // ---- タイトル編集（localStorage 保存） ----
  const h = document.getElementById('sectionTitleHeading');
  const LS_KEY = `sectionTitle:${key}`;
  const saved = localStorage.getItem(LS_KEY);
  if (saved && saved.trim()) h.textContent = saved.trim();

  h.style.cursor = 'pointer';
  h.addEventListener('click', ()=>{
    const current = localStorage.getItem(LS_KEY) || h.textContent;
    const input = window.prompt('タイトルを入力してください。', current);
    if (input === null) return;                // キャンセル
    const next = input.trim();
    if (!next) return;                         // 空白は無視
    localStorage.setItem(LS_KEY, next);
    h.textContent = next;
  });

  // ---- 「追加」ボタン（暫定動作：見出し下に1行追加） ----
  document.getElementById('btnAddInline')?.addEventListener('click', ()=>{
    const input = window.prompt('追加入力（あとで正式フォームに差し替えます）', '');
    if (input === null) return;
    const text = input.trim();
    if (!text) return;

    const sectionEl = document.querySelector('#view section');
    const p = document.createElement('p');
    p.textContent = text;
    sectionEl.appendChild(p);
  });
}
// ルーティング登録と初期化
route('/cover', ()=>renderCover());
route('/section', rest=>renderSection(rest));
navigate();

// 印刷ボタン
document.getElementById('btnPrint')?.addEventListener('click', ()=>window.print());
