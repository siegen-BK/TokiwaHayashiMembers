(() => {
  const routes = {};
  function route(path, handler){ routes[path] = handler; }

  function parseHash(){
    const hash = location.hash || '#/cover';  // "#/section/d1"
    const m = hash.match(/^#(\/[^?]*)/);
    const full = m ? m[1] : '/cover';         // "/section/d1"
    const parts = full.split('/').filter(Boolean); // ["section","d1"]
    const base = '/' + (parts[0] || 'cover');      // "/section"
    const rest = parts.slice(1).join('/') || '';   // "d1"
    return { full, base, rest };
  }

  function navigate(){
    const { full, base, rest } = parseHash();
    const handler = routes[base] || routes['/404'];
    handler && handler(rest);

    // タブの active は「ハッシュ完全一致」のみ
    document.querySelectorAll('.tabs a.tab').forEach(a => {
      const href = a.getAttribute('href') || '';
      a.classList.toggle('active', href === full.replace(/^[^#]*/, '#'));
    });
  }

  window.route = route;
  window.navigate = navigate;
  window.addEventListener('hashchange', navigate);
})();
``
