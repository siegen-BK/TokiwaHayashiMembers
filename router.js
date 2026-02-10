const routes = {};
function route(path, handler){ routes[path]=handler; }
function navigate(){
  const hash = location.hash || '#/cover';
  const [_, base, rest] = hash.split('/');
  const key = `/${base||'cover'}`;
  (routes[key]||routes['/404']||(()=>{}))(rest);
  document.querySelectorAll('.tab').forEach(a=>{
    a.classList.toggle('active', a.getAttribute('href')===hash.replace(/\/$/, ''));
  });
}
window.addEventListener('hashchange', navigate);
window.navigate = navigate;
window.route = route;
