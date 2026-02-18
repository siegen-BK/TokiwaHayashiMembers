// router.js（全文）
(() => {
  const routes = {};

  function route(path, handler) {
    routes[path] = handler;
  }

  function parseHash() {
    // 例: "#/section/d1"
    const hash = location.hash || '#/section/d1';
    const m = hash.match(/^#(\/[^?]*)/);
    const full = m ? m[1] : '/section/d1';           // "/section/d1"
    const parts = full.split('/').filter(Boolean);    // ["section","d1"]
    const base = '/' + (parts[0] || 'section');       // "/section"
    const rest = parts.slice(1).join('/') || '';      // "d1"
    return { hash, full, base, rest };
  }

  function navigate() {
    const { hash, base, rest } = parseHash();
    const handler = routes[base] || routes['/404'];
    if (handler) handler(rest);

    // タブの active（ハッシュ完全一致）
    document.querySelectorAll('.tabs a.tab').forEach(a => {
      a.classList.toggle('active', a.getAttribute('href') === hash);
    });
  }

  window.route = route;
  window.navigate = navigate;

  window.addEventListener('hashchange', navigate);

  // 初期遷移（ハッシュ未設定時は d1 へ）
  if (!location.hash) location.hash = '#/section/d1';
})();
