const routes = {};
function route(path, handler){ routes[path] = handler; }
function navigate(){
  const hash = location.hash || '#/cover';
  const [, base, rest] = hash.split('/'); // '#/section/d1' → ['#','section','d1']
  const key = `/${base || 'cover'}`;
  (routes[key] || (()=>{ document.getElementById('view').textContent='404'; }))(rest);

  // タブの active 切替
  document.querySelectorAll('.tab').forEach(a=>{
    a.classList.toggle('active', a.getAttribute('href') === hash.replace(/\/$/, ''));
  });
}
window.addEventListener('hashchange', navigate);

// 初回ハッシュが無い場合の初期化は app.js 側で navigate() を呼びます
