// 最小のレンダラー（まずはこれだけ）
function renderCover(){
  document.getElementById('view').innerHTML =
    '<section><h2>表紙</h2><p class="note">ここから機能を少しずつ足していきます。</p></section>';
}
function renderSection(id){
  const key = (id || 'd1').toLowerCase();
  const title = key === 'd1' ? '2026年11月3日(月･祝)' :
                key === 'd2' ? '2026年11月4日(火)' :
                                '2026年11月5日(水)';
  document.getElementById('view').innerHTML =
    `<section><h2 id="sectionTitleHeading" title="クリックで編集">${title}</h2><p class="note">（ここに本文を追加します）</p></section>`;
  // 先頭見出しクリックで編集（localStorage保存）
  const LS_KEY = `sectionTitle:${key}`;
  const h = document.getElementById('sectionTitleHeading');
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
}

// ルーティング登録と初期化
route('/cover', ()=>renderCover());
route('/section', rest=>renderSection(rest));
navigate();

// 印刷ボタン
document.getElementById('btnPrint')?.addEventListener('click', ()=>window.print());
