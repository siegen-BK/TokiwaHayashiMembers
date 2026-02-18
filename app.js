(() => {
  // =========================
  // 設定
  // =========================
  const STORAGE_PREFIX = 'membersApp:';
  const DEFAULT_DAY = 'd1';

  const TITLE_BY_DAY = {
    d1: '2026年11月3日(月･祝)',
    d2: '2026年11月4日(火)',
    d3: '2026年11月5日(水)',
  };

  // メンバー保存キー
  const MEMBERS_KEY = `${STORAGE_PREFIX}members`;

  // =========================
  // ユーティリティ
  // =========================
  const $ = (sel, root = document) => root.querySelector(sel);

  function safeJsonParse(text, fallback) {
    try { return JSON.parse(text); } catch { return fallback; }
  }

  function getDayKeyFromHash() {
    const hash = location.hash || '';
    const parts = hash.split('/'); // ['#','section','d1']
    if (parts[1] !== 'section') return null;
    const k = (parts[2] || DEFAULT_DAY).toLowerCase();
    return (k === 'd1' || k === 'd2' || k === 'd3') ? k : DEFAULT_DAY;
  }

  const titleKey = (dayKey) => `${STORAGE_PREFIX}title:${dayKey}`;
  const rowsKey  = (dayKey)  => `${STORAGE_PREFIX}rows:${dayKey}`;

  // HTMLエスケープ（members表表示用）
  function escapeHtml(s){
    return (s ?? '').toString()
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;');
  }

  // CSVセル用エスケープ（書き出し）
  function csvEscape(s){
    const v = (s ?? '').toString();
    if (/[",\n]/.test(v)) return `"${v.replace(/"/g,'""')}"`;
    return v;
  }

  // =========================
  // メンバー（localStorage）
  // =========================
  function getMembers(){
    return safeJsonParse(localStorage.getItem(MEMBERS_KEY) || '[]', []);
  }

  function setMembers(list){
    localStorage.setItem(MEMBERS_KEY, JSON.stringify(list));
  }

  // =========================
  // CSV パース（Excelの "" 対応）
  // =========================
  function parseCSV(text){
    const s = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    const rows = [];
    let row = [];
    let cur = '';
    let inQuotes = false;

    for (let i = 0; i < s.length; i++){
      const ch = s[i];
      const next = s[i+1];

      if (ch === '"'){
        if (inQuotes && next === '"'){ // "" -> "
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (!inQuotes && ch === ','){
        row.push(cur);
        cur = '';
        continue;
      }

      if (!inQuotes && ch === '\n'){
        row.push(cur);
        rows.push(row);
        row = [];
        cur = '';
        continue;
      }

      cur += ch;
    }

    row.push(cur);
    rows.push(row);

    // 空行除去 + trim
    return rows
      .map(r => r.map(c => (c ?? '').trim()))
      .filter(r => r.some(c => c !== ''));
  }

  // A=氏名 B=かな C=生年 D=性別（C/D空欄OK）
  // ヘッダ行（氏名/かな/生年/性別 など）があれば自動でスキップ
  function csvToMembers(csvText){
    const rows = parseCSV(csvText);
    if (!rows.length) throw new Error('CSVが空です');

    const head = rows[0].map(s => (s || '').replace(/\s/g,''));
    const looksHeader = head.some(h => {
      const x = h.toLowerCase();
      return x.includes('氏名') || x.includes('かな') || x.includes('生年') || x.includes('性別')
          || x.includes('name') || x.includes('kana') || x.includes('birth') || x.includes('gender');
    });

    const dataRows = looksHeader ? rows.slice(1) : rows;

    const members = [];
    for (const r of dataRows){
      const name = (r[0] || '').trim();      // A
      const kana = (r[1] || '').trim();      // B
      const birthYear = (r[2] || '').trim(); // C（空欄OK）
      const gender = (r[3] || '').trim();    // D（空欄OK）

      if (!name) continue;

      members.push({
        name,
        kana,
        birthYear: birthYear || '',
        gender: gender || ''
      });
    }

    if (!members.length) throw new Error('有効な氏名が見つかりませんでした');
    return members;
  }

  // =========================
  // 表（/section）行テンプレ
  // =========================
  function rowTemplate() {
    return `
      <div class="row-group" role="rowgroup" aria-label="データ行">
        <div class="cell" style="grid-column:1; grid-row:1;" contenteditable="true" data-field="sectionTop"></div>
        <div class="cell" style="grid-column:1; grid-row:2;" contenteditable="true" data-field="sectionBottom"></div>

        <div class="cell span2" style="grid-column:2; grid-row:1 / span 2;" contenteditable="true" data-field="daido"></div>
        <div class="cell span2" style="grid-column:3; grid-row:1 / span 2;" contenteditable="true" data-field="chudo"></div>
        <div class="cell span2" style="grid-column:4; grid-row:1 / span 2;" contenteditable="true" data-field="sokudo"></div>

        <div class="cell" style="grid-column:5; grid-row:1;" contenteditable="true" data-field="kaneTop"></div>
        <div class="cell split-top" style="grid-column:5; grid-row:2;" contenteditable="true" data-field="kaneBottom"></div>

