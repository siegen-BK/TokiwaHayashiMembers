const routes = {};

function route(path, handler){ routes[path] = handler; }

function navigate(){
  const hash = location.hash || '#/cover';
  const [, base, rest] = hash.split('/'); // '#/section/d1' → ['#','section','d1']
  const key = `/${base || 'cover'}`;

  // ルートが無い場合は /cover に逃がす（内部404回避にもなる）
  const handler = routes[key] || routes['/cover'] || (()=>{ 
    document.getElementById('view').textContent = '404';
  });

  handler(rest);

  // タブの active 切替（完全一致）
  document.querySelectorAll('.tab').forEach(a=>{
    a.classList.toggle('active', a.getAttribute('href') === hash.replace(/\/$/, ''));
  });
}

window.addEventListener('hashchange', navigate);
