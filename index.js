// 焼うどん売上レジ — Cloudflare Worker (API) + D1 (保存先)
const PRICE = 400;
const PAGE = "<!doctype html>\n<html lang=\"ja\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width,initial-scale=1,viewport-fit=cover\">\n<meta name=\"theme-color\" content=\"#7a3e1d\">\n<title>焼うどん売上レジ</title>\n<link rel=\"icon\" href=\"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><circle cx='32' cy='32' r='30' fill='%237a3e1d'/><path d='M14 30c6-6 12 6 18 0s12 6 18 0M14 40c6-6 12 6 18 0s12 6 18 0' stroke='%23f6e3c6' stroke-width='4' fill='none' stroke-linecap='round'/></svg>\">\n<link rel=\"preconnect\" href=\"https://fonts.googleapis.com\">\n<link rel=\"stylesheet\" href=\"https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@500;800&family=Noto+Sans+JP:wght@400;600&display=swap\">\n<style>\n/* Layout: one-column till — total on top, two big buttons, then the timestamped log and daily totals */\n:root{\n  --bg:#f6f3ee; --surface:#ffffff; --fg:#2a211b; --muted:#7a6d63; --line:#e4ddd4;\n  --sauce:#7a3e1d; --sauce-ink:#ffffff; --nori:#2f7a4f; --refund:#b23a3a; --refund-bg:#fbeaea;\n  --display:\"M PLUS Rounded 1c\",\"Hiragino Maru Gothic ProN\",system-ui,sans-serif;\n  --body:\"Noto Sans JP\",\"Hiragino Sans\",system-ui,sans-serif;\n  color-scheme:light;\n}\n@media (prefers-color-scheme:dark){:root{\n  --bg:#1a1613; --surface:#241f1b; --fg:#f1e9e1; --muted:#a8998c; --line:#3a322b;\n  --sauce:#c9733f; --sauce-ink:#1a1613; --nori:#5fbf86; --refund:#ec7b7b; --refund-bg:#3a2222; color-scheme:dark}}\n*{box-sizing:border-box}\nhtml{-webkit-text-size-adjust:100%}\nbody{margin:0;background:var(--bg);color:var(--fg);font-family:var(--body);font-size:15px;line-height:1.6;\n  padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));\n  padding-top:max(20px,env(safe-area-inset-top,0px));padding-bottom:max(48px,env(safe-area-inset-bottom,0px))}\n[hidden]{display:none!important}\n.wrap{max-width:560px;margin:0 auto;display:flex;flex-direction:column;gap:18px}\nheader{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}\nh1{font-family:var(--display);font-weight:800;font-size:1.35rem;margin:0;letter-spacing:.02em}\nh1 small{font-weight:500;font-size:.8rem;color:var(--muted);margin-left:6px}\n.date{display:flex;align-items:center;gap:6px}\ninput,button{font:inherit}\n.date input{padding:6px 10px;border:1px solid var(--line);border-radius:10px;background:var(--surface);color:var(--fg)}\n.ghost{font-size:.85rem;padding:6px 10px;border:1px solid var(--line);border-radius:10px;background:transparent;color:var(--fg);cursor:pointer}\n.total{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:18px 20px;display:flex;flex-direction:column;gap:4px}\n.total .lbl{font-size:.8rem;color:var(--muted);letter-spacing:.08em;display:flex;justify-content:space-between;gap:8px}\n.sync{font-size:.75rem}\n.sync.err{color:var(--refund)}\n.yen{font-family:var(--display);font-weight:800;font-size:clamp(2.4rem,11vw,3.4rem);line-height:1.1;font-variant-numeric:tabular-nums}\n.yen span{font-size:.5em;margin-left:2px}\n.stats{display:flex;gap:16px;flex-wrap:wrap;color:var(--muted);font-size:.9rem;font-variant-numeric:tabular-nums}\n.stats b{color:var(--fg);font-weight:600}\n.stats .r b{color:var(--refund)}\n.btns{display:grid;grid-template-columns:2fr 1fr;gap:12px}\n.btn{border:0;border-radius:20px;cursor:pointer;font-family:var(--display);font-weight:800;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;min-height:150px;transition:transform .08s ease;touch-action:manipulation;-webkit-tap-highlight-color:transparent}\n.btn:active{transform:scale(.97)}\n.btn:focus-visible,.ghost:focus-visible,.del:focus-visible{outline:3px solid var(--nori);outline-offset:3px}\n.btn:disabled{opacity:.5;cursor:wait}\n.sell{background:var(--sauce);color:var(--sauce-ink);font-size:1.7rem}\n.sell small{font-size:.9rem;font-weight:500;opacity:.9}\n.ret{background:var(--refund-bg);color:var(--refund);font-size:1.25rem;border:2px solid var(--refund)}\n.ret small{font-size:.8rem;font-weight:500}\n.flash{animation:flash .5s ease}\n@keyframes flash{0%{box-shadow:0 0 0 0 var(--nori)}100%{box-shadow:0 0 0 14px transparent}}\n.toast{min-height:1.6em;text-align:center;font-size:.9rem;color:var(--nori);font-weight:600}\n.toast.err{color:var(--refund)}\n.sec{display:flex;justify-content:space-between;align-items:baseline;gap:8px}\n.sec h2{font-family:var(--display);font-size:1rem;margin:0}\nul.list{list-style:none;margin:0;padding:0;background:var(--surface);border:1px solid var(--line);border-radius:16px;overflow:hidden}\n.list li{display:grid;grid-template-columns:auto 1fr auto auto;gap:12px;align-items:center;padding:10px 14px;border-top:1px solid var(--line);font-variant-numeric:tabular-nums}\n.list li:first-child{border-top:0}\n.list.days li{grid-template-columns:1fr auto auto;cursor:pointer}\n.list.days li:hover{background:color-mix(in srgb,var(--sauce) 6%,transparent)}\n.tag{font-size:.75rem;font-weight:600;padding:2px 8px;border-radius:999px;background:color-mix(in srgb,var(--sauce) 15%,transparent);color:var(--sauce)}\n.tag.r{background:var(--refund-bg);color:var(--refund)}\n.time{font-size:1rem}\n.amt{font-weight:600}\n.amt.r{color:var(--refund)}\n.muted{color:var(--muted);font-size:.85rem}\n.del{font-size:.8rem;background:none;border:0;color:var(--muted);cursor:pointer;padding:4px 6px;border-radius:8px}\n.del:hover{color:var(--refund)}\n.del.confirm{background:var(--refund);color:#fff}\n.list li.empty{display:block;padding:28px 16px;text-align:center;color:var(--muted)}\n.note{font-size:.8rem;color:var(--muted);text-align:center;margin:0}\n.lock{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:24px 20px;display:flex;flex-direction:column;gap:12px}\n.lock h2{font-family:var(--display);margin:0;font-size:1.1rem}\n.lock form{display:flex;gap:8px}\n.lock input{flex:1;min-width:0;padding:10px 12px;border:1px solid var(--line);border-radius:12px;background:var(--bg);color:var(--fg);font-size:1.1rem}\n.lock button{padding:10px 16px;border:0;border-radius:12px;background:var(--sauce);color:var(--sauce-ink);font-weight:600;cursor:pointer}\n@media (prefers-reduced-motion:reduce){.btn,.flash{transition:none;animation:none}}\n</style>\n</head>\n<body>\n<div class=\"wrap\">\n  <header>\n    <h1>焼うどん<small>1食 400円</small></h1>\n    <div class=\"date\">\n      <input type=\"date\" id=\"day\" aria-label=\"表示する日\">\n      <button class=\"ghost\" id=\"today\" type=\"button\">今日</button>\n    </div>\n  </header>\n\n  <section class=\"lock\" id=\"lock\" hidden>\n    <h2>パスコードを入力</h2>\n    <p class=\"muted\" style=\"margin:0\">お店で決めたパスコードを入れてください。この端末に記憶されます。</p>\n    <form id=\"lockForm\">\n      <input id=\"pass\" type=\"password\" inputmode=\"numeric\" autocomplete=\"current-password\" aria-label=\"パスコード\">\n      <button type=\"submit\">開く</button>\n    </form>\n    <p class=\"muted\" id=\"lockErr\" style=\"margin:0;color:var(--refund)\" role=\"alert\"></p>\n  </section>\n\n  <div id=\"app\">\n    <div class=\"wrap\">\n      <section class=\"total\" aria-live=\"polite\">\n        <div class=\"lbl\"><span id=\"dayLabel\">今日の売上</span><span class=\"sync\" id=\"sync\"></span></div>\n        <div class=\"yen\" id=\"yen\">0<span>円</span></div>\n        <div class=\"stats\">\n          <div>販売 <b id=\"nSold\">0</b> 食</div>\n          <div class=\"r\">返品 <b id=\"nRet\">0</b> 食</div>\n          <div>差し引き <b id=\"nNet\">0</b> 食</div>\n        </div>\n      </section>\n\n      <div class=\"btns\">\n        <button class=\"btn sell\" id=\"sell\" type=\"button\">売れた！<small>＋400円</small></button>\n        <button class=\"btn ret\" id=\"ret\" type=\"button\">返品<small>−400円</small></button>\n      </div>\n      <div class=\"toast\" id=\"toast\" role=\"status\"></div>\n\n      <div class=\"sec\">\n        <h2>記録</h2>\n        <button class=\"ghost\" id=\"csv\" type=\"button\">この日のCSV</button>\n      </div>\n      <ul class=\"list\" id=\"log\"><li class=\"empty\">読み込み中…</li></ul>\n      <p class=\"note\">押し間違えた記録は「取消」で消せます（2回タップで確定）。</p>\n\n      <div class=\"sec\">\n        <h2>日別の売上</h2>\n        <button class=\"ghost\" id=\"csvAll\" type=\"button\">全期間のCSV</button>\n      </div>\n      <ul class=\"list days\" id=\"days\"><li class=\"empty\">まだありません</li></ul>\n    </div>\n  </div>\n</div>\n\n<script>\nconst PRICE = 400;\nconst $ = id => document.getElementById(id);\nconst pad = n => String(n).padStart(2,\"0\");\nconst jstToday = () => new Date(Date.now()+9*3600e3).toISOString().slice(0,10);\nconst jstTime = ts => new Date(ts+9*3600e3).toISOString().slice(11,19);\nconst yen = n => Number(n||0).toLocaleString(\"ja-JP\");\nlet pass = \"\"; try{ pass = localStorage.getItem(\"yakiudon-pass\")||\"\"; }catch{}\nlet busy = false, pollTimer = null;\n\nasync function api(path, opts={}){\n  const res = await fetch(path, {...opts, headers:{\"content-type\":\"application/json\",\"x-passcode\":pass,...(opts.headers||{})}});\n  if(res.status===401){ showLock(true); throw new Error(\"auth\"); }\n  if(!res.ok){ let m=\"通信エラー\"; try{ m=(await res.json()).error||m; }catch{} throw new Error(m); }\n  return res;\n}\n\nfunction toast(msg, err){ const t=$(\"toast\"); t.textContent=msg; t.className=\"toast\"+(err?\" err\":\"\"); clearTimeout(toast.t); toast.t=setTimeout(()=>t.textContent=\"\",2500); }\nfunction setSync(ok){ const s=$(\"sync\"); s.textContent = ok ? \"保存済み \"+jstTime(Date.now()).slice(0,5) : \"接続できません\"; s.className=\"sync\"+(ok?\"\":\" err\"); }\n\nfunction showLock(on){ $(\"lock\").hidden=!on; $(\"app\").hidden=on; if(on) setTimeout(()=>$(\"pass\").focus(),50); }\n\nfunction renderTotals(d){\n  const isToday = $(\"day\").value === jstToday();\n  $(\"dayLabel\").textContent = isToday ? \"今日の売上\" : `${$(\"day\").value.replace(/-/g,\"/\")} の売上`;\n  $(\"yen\").innerHTML = `${yen(d.total)}<span>円</span>`;\n  $(\"nSold\").textContent = d.sold; $(\"nRet\").textContent = d.refunded; $(\"nNet\").textContent = d.sold - d.refunded;\n}\n\nfunction renderLog(rows){\n  const ul=$(\"log\"); ul.innerHTML=\"\";\n  if(!rows.length){ ul.innerHTML=`<li class=\"empty\">まだ記録がありません。売れたら「売れた！」を押してください。</li>`; return; }\n  for(const r of rows){\n    const isR = r.type===\"refund\", li=document.createElement(\"li\");\n    li.innerHTML = `<span class=\"tag ${isR?\"r\":\"\"}\">${isR?\"返品\":\"販売\"}</span>\n      <span class=\"time\">${jstTime(r.ts)}</span>\n      <span class=\"amt ${isR?\"r\":\"\"}\">${isR?\"−\":\"+\"}${yen(PRICE)}円</span>`;\n    const b=document.createElement(\"button\"); b.className=\"del\"; b.type=\"button\"; b.textContent=\"取消\";\n    b.onclick=()=>{\n      if(!b.classList.contains(\"confirm\")){ b.classList.add(\"confirm\"); b.textContent=\"消す？\"; setTimeout(()=>{b.classList.remove(\"confirm\"); b.textContent=\"取消\";},3000); return; }\n      remove(r.id);\n    };\n    li.appendChild(b); ul.appendChild(li);\n  }\n}\n\nfunction renderDays(days){\n  const ul=$(\"days\"); ul.innerHTML=\"\";\n  if(!days.length){ ul.innerHTML=`<li class=\"empty\">まだありません</li>`; return; }\n  for(const d of days){\n    const li=document.createElement(\"li\");\n    li.innerHTML=`<span>${d.day.replace(/-/g,\"/\")}</span><span class=\"muted\">販売${d.sold}・返品${d.refunded}</span><span class=\"amt\">${yen(d.total)}円</span>`;\n    li.onclick=()=>{ $(\"day\").value=d.day; load(); window.scrollTo({top:0,behavior:\"smooth\"}); };\n    ul.appendChild(li);\n  }\n}\n\nasync function load(){\n  try{\n    const [s, d] = await Promise.all([\n      api(`/api/sales?day=${$(\"day\").value}`).then(r=>r.json()),\n      api(`/api/days`).then(r=>r.json()),\n    ]);\n    renderTotals(s); renderLog(s.rows); renderDays(d.days); setSync(true);\n  }catch(e){ if(e.message!==\"auth\") setSync(false); }\n}\n\nasync function add(type){\n  if(busy) return; busy=true;\n  const btn = type===\"sale\" ? $(\"sell\") : $(\"ret\");\n  btn.classList.remove(\"flash\"); void btn.offsetWidth; btn.classList.add(\"flash\");\n  try{\n    const res = await api(\"/api/sales\",{method:\"POST\",body:JSON.stringify({type})});\n    const data = await res.json();\n    if($(\"day\").value!==data.day) $(\"day\").value=data.day;\n    toast(`${jstTime(data.row.ts).slice(0,5)} ${type===\"sale\"?\"販売\":\"返品\"}を記録しました`);\n    await load();\n  }catch(e){ if(e.message!==\"auth\") toast(\"記録できませんでした。もう一度押してください。\",true); }\n  finally{ busy=false; }\n}\n\nasync function remove(id){\n  try{ await api(`/api/sales/${id}`,{method:\"DELETE\"}); toast(\"取り消しました\"); await load(); }\n  catch(e){ if(e.message!==\"auth\") toast(\"取り消せませんでした\",true); }\n}\n\nasync function downloadCsv(day){\n  try{\n    const res = await api(`/api/export.csv${day?`?day=${day}`:\"\"}`);\n    const blob = await res.blob(), a=document.createElement(\"a\");\n    a.href=URL.createObjectURL(blob); a.download=`焼うどん売上_${day||\"全期間\"}.csv`;\n    document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),1000);\n  }catch(e){ if(e.message!==\"auth\") toast(\"CSVを作れませんでした\",true); }\n}\n\n$(\"lockForm\").onsubmit = async e => {\n  e.preventDefault(); pass = $(\"pass\").value.trim();\n  try{ await api(\"/api/ping\"); try{ localStorage.setItem(\"yakiudon-pass\",pass); }catch{} showLock(false); load(); }\n  catch(err){ $(\"lockErr\").textContent = err.message===\"auth\" ? \"パスコードが違います\" : \"接続できません。通信を確認してください。\"; }\n};\n$(\"day\").value = jstToday();\n$(\"day\").onchange = load;\n$(\"today\").onclick = ()=>{ $(\"day\").value=jstToday(); load(); };\n$(\"sell\").onclick = ()=>add(\"sale\");\n$(\"ret\").onclick = ()=>add(\"refund\");\n$(\"csv\").onclick = ()=>downloadCsv($(\"day\").value);\n$(\"csvAll\").onclick = ()=>downloadCsv(\"\");\n\n// 複数の端末で使っても揃うよう、15秒ごとに読み直す\nload();\npollTimer = setInterval(()=>{ if(!document.hidden && $(\"lock\").hidden) load(); }, 15000);\ndocument.addEventListener(\"visibilitychange\", ()=>{ if(!document.hidden) load(); });\n</script>\n</body>\n</html>\n";
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

let schemaReady = false;
async function ensureSchema(db) {
  if (schemaReady) return;
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK (type IN ('sale','refund')),
      amount INTEGER NOT NULL,
      ts INTEGER NOT NULL,
      day TEXT NOT NULL
    )`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_sales_day ON sales(day, ts)`),
  ]);
  schemaReady = true;
}

const jstDay = (ts) => new Date(ts + JST_OFFSET_MS).toISOString().slice(0, 10);
const jstStamp = (ts) => new Date(ts + JST_OFFSET_MS).toISOString().slice(0, 19).replace("T", " ");
const isDay = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

function authorized(request, env) {
  if (!env.PASSCODE) return true; // パスコード未設定なら誰でも使える
  return request.headers.get("x-passcode") === env.PASSCODE;
}

async function summary(db, day) {
  const r = await db
    .prepare(
      `SELECT SUM(type='sale') AS sold, SUM(type='refund') AS refunded, COALESCE(SUM(amount),0) AS total
       FROM sales WHERE day = ?`
    )
    .bind(day)
    .first();
  return { sold: r.sold || 0, refunded: r.refunded || 0, total: r.total || 0 };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/"))
      return new Response(PAGE, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });

    if (!authorized(request, env)) return json({ error: "パスコードが違います" }, 401);
    const db = env.DB;
    await ensureSchema(db);

    // 動作確認用
    if (url.pathname === "/api/ping") return json({ ok: true, price: PRICE, today: jstDay(Date.now()) });

    // 1日の記録と合計
    if (url.pathname === "/api/sales" && request.method === "GET") {
      const day = url.searchParams.get("day") || jstDay(Date.now());
      if (!isDay(day)) return json({ error: "日付の形式が違います" }, 400);
      const { results } = await db
        .prepare(`SELECT id, type, amount, ts FROM sales WHERE day = ? ORDER BY ts DESC, id DESC`)
        .bind(day)
        .all();
      return json({ day, price: PRICE, rows: results, ...(await summary(db, day)) });
    }

    // 販売 / 返品を記録（時刻はサーバーで付ける）
    if (url.pathname === "/api/sales" && request.method === "POST") {
      let body = {};
      try { body = await request.json(); } catch {}
      const type = body.type;
      if (type !== "sale" && type !== "refund") return json({ error: "type は sale か refund" }, 400);
      const ts = Date.now();
      const day = jstDay(ts);
      const amount = type === "sale" ? PRICE : -PRICE;
      const row = await db
        .prepare(`INSERT INTO sales (type, amount, ts, day) VALUES (?, ?, ?, ?) RETURNING id, type, amount, ts`)
        .bind(type, amount, ts, day)
        .first();
      return json({ day, row, ...(await summary(db, day)) }, 201);
    }

    // 押し間違いの取消
    const m = url.pathname.match(/^\/api\/sales\/(\d+)$/);
    if (m && request.method === "DELETE") {
      const row = await db.prepare(`DELETE FROM sales WHERE id = ? RETURNING day`).bind(Number(m[1])).first();
      if (!row) return json({ error: "記録が見つかりません" }, 404);
      return json({ ok: true, day: row.day, ...(await summary(db, row.day)) });
    }

    // 日別の合計
    if (url.pathname === "/api/days" && request.method === "GET") {
      const { results } = await db
        .prepare(
          `SELECT day, SUM(type='sale') AS sold, SUM(type='refund') AS refunded, SUM(amount) AS total
           FROM sales GROUP BY day ORDER BY day DESC LIMIT 60`
        )
        .all();
      return json({ days: results });
    }

    // CSV（Excel で開けるよう BOM 付き）
    if (url.pathname === "/api/export.csv" && request.method === "GET") {
      const day = url.searchParams.get("day");
      if (day && !isDay(day)) return json({ error: "日付の形式が違います" }, 400);
      const stmt = day
        ? db.prepare(`SELECT id, type, amount, ts FROM sales WHERE day = ? ORDER BY ts`).bind(day)
        : db.prepare(`SELECT id, type, amount, ts FROM sales ORDER BY ts`);
      const { results } = await stmt.all();
      const lines = ["番号,日時(日本時間),種別,金額"];
      let total = 0;
      for (const r of results) {
        total += r.amount;
        lines.push(`${r.id},${jstStamp(r.ts)},${r.type === "sale" ? "販売" : "返品"},${r.amount}`);
      }
      lines.push(`,,合計,${total}`);
      const name = `yakiudon_${day || "all"}.csv`;
      return new Response("﻿" + lines.join("\r\n"), {
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": `attachment; filename="${name}"`,
          "cache-control": "no-store",
        },
      });
    }

    return json({ error: "Not found" }, 404);
  },
};
