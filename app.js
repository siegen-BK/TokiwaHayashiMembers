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

  // 見出し行の左に「追加」ボタンを配置
  document.getElementById('view').innerHTML =
    `<section>
        <div class="section-header">
          <button id="btnAddInline" class="btn-add" title="このページに要素を追加">＋ 追加</button>
          <h2 id="sectionTitleHeading" title="クリックで編集">${title}</h2>
        </div>
     </section>`;

  // ---- タイトル編集（localStorage 保存） ----
  const h = document.getElementById('sectionTitleHeading');
  const LS_KEY = `sectionTitle:${key}`;
  const saved = localStorage.getItem(LS_KEY);
  if(saved && saved.trim()) h.textContent = saved.trim();

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

  // ---- 「追加」ボタンクリック（暫定動作） ----
  document.getElementById('btnAddInline')?.addEventListener('click', ()=>{
    // とりあえず、見出しの下に 1 行 <p> を追加（あとで任意の追加機能に差し替え）
    const input = window.prompt('追加入力（あとで自由に差し替えできます）', '');
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
