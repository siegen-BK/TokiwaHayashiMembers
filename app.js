(async function(){
  const cfg = await window.loadAppConfig();
  window.APP_CFG = cfg;

  document.getElementById('yearLabel').textContent = cfg.YEAR_LABEL || '';
  document.getElementById('appTitle').textContent = cfg.APP_TITLE || 'メンバー表';

  route('/cover', ()=>Renderers.renderCover(cfg));
  route('/day', (rest)=>Renderers.renderDay(cfg, rest || (cfg.DAYS[0]?.id)));
  route('/excerpts', ()=>Renderers.renderExcerpts(cfg));
  route('/members', ()=>Renderers.renderMembers(cfg));
  route('/404', ()=>{ document.getElementById('view').textContent='404'; });
  navigate();

  document.getElementById('btnPrint').addEventListener('click', ()=>window.print());

  const modal = document.getElementById('settingsModal');
  const open = ()=>{ modal.classList.remove('hidden'); 
    document.getElementById('remoteConfigUrl').value = cfg.REMOTE_CONFIG_URL||'';
    document.getElementById('membersUrl').value = cfg.SOURCES.members || '';
    document.getElementById('attendanceUrl').value = cfg.SOURCES.attendance || '';
  };
  const close= ()=>modal.classList.add('hidden');
  document.getElementById('btnSettings').addEventListener('click', open);
  document.getElementById('closeCfg').addEventListener('click', close);
  document.getElementById('testConn').addEventListener('click', async ()=>{
    const m = document.getElementById('membersUrl').value.trim();
    const a = document.getElementById('attendanceUrl').value.trim();
    const ok = async (u)=>{ try{ const r=await fetch(u,{cache:'no-store'}); return r.ok; } catch { return false; } };
    const msg = `名簿:${await ok(m)?'OK':'NG'} / 出欠:${await ok(a)?'OK':'NG'}`;
    document.getElementById('cfgMsg').textContent = msg;
  });
  document.getElementById('saveCfg').addEventListener('click', ()=>{
    const override = {
      REMOTE_CONFIG_URL: document.getElementById('remoteConfigUrl').value.trim(),
      SOURCES: {
        ...cfg.SOURCES,
        members: document.getElementById('membersUrl').value.trim(),
        attendance: document.getElementById('attendanceUrl').value.trim()
      }
    };
    localStorage.setItem('APP_CONFIG_OVERRIDE', JSON.stringify(override));
    location.reload();
  });
})();
``
