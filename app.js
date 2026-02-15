(async function(){
  const cfg = window.APP_CONFIG || {};
  window.APP_CFG = cfg;

  // ヘッダー反映
  document.getElementById('yearLabel').textContent = cfg.YEAR_LABEL || '';
  document.getElementById('appTitle').textContent = cfg.APP_TITLE || 'メンバー表';

  // ルーティング（最小）
  route('/cover', ()=>Renderers.renderCover(cfg));
  route('/section', (rest)=>{
    const id = (rest || 'd1').toLowerCase();
    Renderers.renderFixedSectionClickableTitle(cfg, id);
  });
  route('/404', ()=>{ document.getElementById('view').textContent='404'; });

  // 初期ページ
  navigate();

  // 印刷
  document.getElementById('btnPrint')?.addEventListener('click', ()=>window.print());

  // 設定（今回は閉じるだけ）
  const modal = document.getElementById('settingsModal');
  document.getElementById('btnSettings')?.addEventListener('click', ()=>modal.classList.remove('hidden'));
  document.getElementById('closeCfg')?.addEventListener('click', ()=>modal.classList.add('hidden'));
})();
