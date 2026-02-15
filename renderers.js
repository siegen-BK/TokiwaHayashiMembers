// 共有ユーティリティ
function el(html){
  const t=document.createElement('template');
  t.innerHTML=html.trim();
  return t.content.firstElementChild;
}

// ---------------- 表紙 ----------------
function renderCover(cfg){
  const v = document.getElementById('view'); v.innerHTML='';
  const card = el(`<section class="cover card page-cover">
    <h2 class="h1">${cfg.COVER?.title || ''}</h2>
    ${cfg.COVER?.image ? `<img src="${cfg.COVER.image}" alt="" />` : ''}
    ${cfg.COVER?.caption ? `<p class="note">${cfg.COVER.caption}</p>` : ''}
  </section>`);
  v.appendChild(card);
  v.appendChild(el(`<div class="page-break"></div>`));
}

// -------- 3固定セクション（見出しクリックで編集） --------
async function renderFixedSectionClickableTitle(cfg, sectionId){
  const v = document.getElementById('view'); v.innerHTML='';

  const secs = cfg.SECTIONS || [];
  const sec = secs.find(s => s.id === sectionId) || secs[0] || { id: sectionId, titleDefault: sectionId };
  const LS_KEY = `sectionTitle:${sec.id}`;

  const saved = localStorage.getItem(LS_KEY);
  const heading = saved?.trim() || sec.titleDefault || sec.id;

  // 見出し（クリックで編集）
  const titleCard = el(`<section class="card page-title">
    <h2 id="sectionTitleHeading" class="h1" style="margin:6px 0;" title="クリックして編集">${heading}</h2>
    <p class="note" style="margin:4px 0 0 0;">※ 見出しをクリックすると編集できます（自動では表示しません）。</p>
  </section>`);
  v.appendChild(titleCard);

  const h = titleCard.querySelector('#sectionTitleHeading');
  h.addEventListener('click', ()=>{
    const current = localStorage.getItem(LS_KEY) || heading;
    const input = window.prompt('見出しタイトルを入力してください。', current);
    if (input === null) return;
    const next = input.trim();
    if (!next) return;
    localStorage.setItem(LS_KEY, next);
    h.textContent = next;
  });

  // プレースホルダ本文（必要になればここに日別の内容を追加）
  const body = el(`<section class="card">
    <p class="note">（ここに本文を追加します）</p>
  </section>`);
  v.appendChild(body);

  v.appendChild(el(`<div class="page-break"></div>`));
}

window.Renderers = { renderCover, renderFixedSectionClickableTitle };
