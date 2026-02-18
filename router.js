(() => {
  const routes = {};
  function route(path, handler){ routes[path] = handler; }

  function parseHash(){
    const hash = location.hash || '#/cover';     // "#/section/d1"
    const m = hash.match(/^#(\/[^?]*)/);
    const full = m ? m[1] : '/cover';            // "/section/d1"
    const parts = full.split('/').filter(Boolean);
    const base = '/' + (parts[0] || 'cover');    // "/section"
    const rest = parts.slice(1).join('/') || ''; // "d1"
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
})();
``
