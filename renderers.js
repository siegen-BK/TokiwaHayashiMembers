async function fetchJSONsafe(url, fallback){
  try{ const r = await fetch(url, {cache:'no-store'}); if(!r.ok) throw 0; return await r.json(); }
  catch{ return fallback??null; }
}
function el(html){ const t=document.createElement('template'); t.innerHTML=html.trim(); return t.content.firstElementChild; }

function renderCover(cfg){
  const v = document.getElementById('view'); v.innerHTML='';
  const card = el(`<section class="cover card page-cover">
    <h2 class="h1">${cfg.COVER.title}</h2>
    <img src="${cfg.COVER.image}" alt="cover">
    <p class="note">${cfg.COVER.caption||''}</p>
  </section>`);
  v.appendChild(card);
}

async function renderDay(cfg, dayId){
  const v = document.getElementById('view'); v.innerHTML='';
  const day = cfg.DAYS.find(d=>d.id===dayId) || cfg.DAYS[0];

  const bar = el(`<section class="day-toolbar card">
    <label>日付:
      <select id="daySel">${cfg.DAYS.map(d=>`<option value="${d.id}" ${d.id===day.id?'selected':''}>${d.label}</option>`).join('')}</select>
    </label>
  </section>`);
  v.appendChild(bar);
  bar.querySelector('#daySel').addEventListener('change', e=>location.hash=`#/day/${e.target.value}`);

  const assignUrl = cfg.SOURCES.assign[day.id];
  const assigns = await fetchJSONsafe(assignUrl, { parts:[] });
  const panel = el(`<section class="card page-day">
    <h3 class="h2">${day.label}｜楽器別割当</h3>
    <div class="grid-roles"></div>
  </section>`);
  const grid = panel.querySelector('.grid-roles');
  (assigns.parts||[]).forEach(p=>{
    const box = el(`<div class="role-box">
      <div class="role-title">${p.part}</div>
      <div class="role-list">${(p.members||[]).map(n=>`<div>${n}</div>`).join('')}</div>
    </div>`);
    grid.appendChild(box);
  });
  v.appendChild(panel);

  const routeUrl = cfg.SOURCES.route[day.id];
  const routes = await fetchJSONsafe(routeUrl, { items:[] });
  const routeCard = el(`<section class="card">
    <h3 class="h2">区間・場所</h3>
    <ol class="route-list">${(routes.items||[]).map(x=>`<li>${x.no?`${x.no}. `:''}${x.text}</li>`).join('')}</ol>
  </section>`);
  v.appendChild(routeCard);

  const notesUrl = cfg.SOURCES.notes[day.id];
  const notes = await fetchJSONsafe(notesUrl, { items:[] });
  if ((notes.items||[]).length){
    const noteCard = el(`<section class="card">
      <h3 class="h2">備考・注意事項</h3>
      <ul>${notes.items.map(s=>`<li>${s}</li>`).join('')}</ul>
    </section>`);
    v.appendChild(noteCard);
  }
  v.appendChild(el(`<div class="page-break"></div>`));
}

async function renderExcerpts(cfg){
  const v = document.getElementById('view'); v.innerHTML='';
  const wrap = el(`<section class="card page-excerpts">
    <h3 class="h2">抜粋（保存済みフィルタ）</h3>
    <div class="day-toolbar"></div>
  </section>`);
  const bar = wrap.querySelector('.day-toolbar');
  cfg.EXCERPTS.forEach(ex=>{
    const btn = el(`<button>${ex.label}</button>`);
    btn.addEventListener('click', ()=>showExcerpt(cfg, ex));
    bar.appendChild(btn);
  });
  v.appendChild(wrap);
  v.appendChild(el(`<div id="excerptResult" class="card"></div>`));
}

async function showExcerpt(cfg, ex){
  const out = document.getElementById('excerptResult'); out.innerHTML='';
  if (ex.type==='assign'){
    const all = [];
    for (const d of cfg.DAYS){
      const u = cfg.SOURCES.assign[d.id];
      const dat = await fetchJSONsafe(u, { parts:[] });
      (dat.parts||[]).forEach(p=>{
        (p.members||[]).forEach(n=>all.push({ day:d.label, part:p.part, name:n }));
      });
    }
    const filtered = all.filter(r=>{
      if (ex.op==='eq') return String(r[ex.field]||'')===String(ex.value||'');
      return true;
    });
    out.appendChild(el(`<h4>${ex.label}</h4>`));
    const tbl = el(`<table class="table"><thead><tr><th>日付</th><th>楽器</th><th>氏名</th></tr></thead><tbody></tbody></table>`);
    const tb = tbl.querySelector('tbody');
    filtered.forEach(r=>tb.appendChild(el(`<tr><td>${r.day}</td><td>${r.part}</td><td>${r.name}</td></tr>`)));
    out.appendChild(tbl);
  }
}

async function renderMembers(cfg){
  const v = document.getElementById('view'); v.innerHTML='';
  const dat = await fetchJSONsafe(cfg.SOURCES.members, []);
  const card = el(`<section class="card page-members">
    <div class="day-toolbar">
      <input id="q" placeholder="氏名/班/役割を検索"/>
    </div>
    <table class="table"><thead><tr><th>氏名</th><th>班</th><th>役割</th><th>ステータス</th></tr></thead><tbody></tbody></table>
  </section>`);
  const tb = card.querySelector('tbody');
  function render(list){
    tb.innerHTML='';
    list.forEach(m=>tb.appendChild(el(`<tr>
      <td>${m.name||''}</td><td>${m.group||''}</td><td><span class="badge">${m.role||''}</span></td><td>${m.status||''}</td>
    </tr>`)));
  }
  render(dat);
  card.querySelector('#q').addEventListener('input', e=>{
    const q = e.target.value.trim().toLowerCase();
    const f = dat.filter(m => (`${m.name||''}${m.group||''}${m.role||''}`).toLowerCase().includes(q));
    render(f);
  });
  v.appendChild(card);
}

window.Renderers = { renderCover, renderDay, renderExcerpts, renderMembers };
