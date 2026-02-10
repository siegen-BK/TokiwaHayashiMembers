async function fetchJSON(url){
  const r = await fetch(url, { cache:'no-store' });
  if(!r.ok) throw new Error(`${r.status} ${url}`);
  return await r.json();
}
async function loadAppConfig(){
  let cfg = structuredClone(window.APP_CONFIG || {});
  if (cfg.REMOTE_CONFIG_URL){
    try{ cfg = { ...cfg, ...(await fetchJSON(cfg.REMOTE_CONFIG_URL)) }; }
    catch(e){ console.warn('REMOTE_CONFIG 読み込み失敗', e); }
  }
  try{
    const s = localStorage.getItem('APP_CONFIG_OVERRIDE');
    if(s) cfg = { ...cfg, ...JSON.parse(s) };
  }catch(e){}
  const p = new URLSearchParams(location.search);
  if (p.get('config')) cfg.REMOTE_CONFIG_URL = p.get('config');
  return cfg;
}
window.loadAppConfig = loadAppConfig;
