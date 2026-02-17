// 超シンプルなハッシュルーター
const routes = {};

function route(path, handler) {
  routes[path] = handler;
}

function navigate() {
  const hash = location.hash || '#/cover';
  const parts = hash.split('/');           // 例: "#/section/d1" → ["#", "section", "d1"]
  const base  = parts[1] || 'cover';       // "section" / "cover" など
  const rest  = parts[2];                  // "d1" / undefined
  const key   = `/${base}`;

  // ハンドラが無ければ /cover にフォールバック（最終手段は 404 表示）
  const handler =
    routes[key] ||
    routes['/cover'] ||
    (() => {
      const v = document.getElementById('view');
      if (v) v.textContent = '404';
    });

  handler(rest);

  // タブの active 切替（完全一致、末尾スラッシュ無視）
  const norm = (s) => (s || '').replace(/\/$/, '');
  document.querySelectorAll('.tab').forEach((a) => {
    const href = a.getAttribute('href') || '';
    a.classList.toggle('active', norm(href) === norm(hash));
  });
}

window.addEventListener('hashchange', navigate);

// ★ app.js から呼べるように「公開」するのが重要
window.route = route;
window.navigate = navigate;
window.routes = routes; // （任意）デバッグ用
