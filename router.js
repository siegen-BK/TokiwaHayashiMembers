(() => {
  // シンプルなハッシュルータ
  const routes = {};
  function route(path, handler){
    routes[path] = handler;
  }

  function parseHash(){
    const hash = location.hash || '#/cover'; // 例: "#/section/d1"
    const m = hash.match(/^#(\/[^?]*)/);
    const full = m ? m[1] : '/cover';       // "/section/d1"
    const parts = full.split('/').filter(Boolean); // ["section","d1"]
    const base = '/' + (parts[0] || 'cover');      // "/section"
    const rest = parts.slice(1).join('/') || '';   // "d1"
    return { base, rest };
  }

  function navigate(){
    const { base, rest } = parseHash();
    const handler = routes[base] || routes['/404'];
    handler && handler(rest);

    // タブのactive表示
    document.querySelectorAll('.tabs .tab').forEach(a => {
      const href = a.getAttribute('href') || '';
      const active = href.startsWith('#' + base);
      a.classList.toggle('active', active);
    });
  }

  window.route = route;
  window.navigate = navigate;

  window.addEventListener('hashchange', navigate);
})();
