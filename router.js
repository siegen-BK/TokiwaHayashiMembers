(() => {
  const routes = {};
  function route(path, handler){ routes[path] = handler; }

  function parseHash(){
    const hash = location.hash || '#/section/d1';     // 例: "#/section/d1"
    const m = hash.match(/^#(\/[^?]*)/);
    const full = m ? m[1] : '/section/d1';            // "/section/d1"
    const parts = full.split('/').filter(Boolean);    // ["section","d1"]
    const base = '/' + (parts[0] || 'section');       // "/section"
    const rest = parts.slice(1).join('/') || '';      // "d1"
    return { hash, full, base, rest };
  }

  function navigate(){
    const { hash, base, rest } = parseHash();
    const handler = routes[base] || routes['/404'];
    handler && handler(rest);

    // タブ選択（ハッシュ完全一致）
    document.querySelectorAll('.tabs a.tab').forEach(a => {
      a.classList.toggle('active', a.getAttribute('href') === hash);
    });
  }

  window.route = route;
  window.navigate = navigate;

  window.addEventListener('hashchange', navigate);

  // 初期遷移（index.htmlに依存せず安定化）
  if (!location.hash) location.hash = '#/section/d1';
})();
