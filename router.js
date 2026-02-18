(() => {
  const routes = {};
  function route(path, handler){ routes[path] = handler; }

  function navigate(){
    const hash = location.hash || '#/section/d1';
    const parts = hash.replace('#', '').split('/').filter(Boolean);
    const base = '/' + (parts[0] || 'section');
    const rest = parts.slice(1).join('/') || 'd1';

    const handler = routes[base];
    if (handler) handler(rest);

    document.querySelectorAll('.tabs a.tab').forEach(a => {
      a.classList.toggle('active', a.getAttribute('href') === hash);
    });
  }

  window.route = route;
  window.navigate = navigate;
  window.addEventListener('hashchange', navigate);
})();
