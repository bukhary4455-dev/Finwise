const CATS = ["Food", "Transport", "Bills", "Shopping", "Health", "Entertainment", "Education", "Rent", "Other"];
const EM = { Food: "🍔", Transport: "🚌", Bills: "🧾", Shopping: "🛍️", Health: "💊", Entertainment: "🎬", Education: "📚", Rent: "🏠", Other: "📦" };
const KEY = "exp_tracker_v1";
let S = { income: [], expenses: [], limit: 0 };

try {
  const r = localStorage.getItem(KEY);
  if (r) S = Object.assign(S, JSON.parse(r));
} catch (e) {}

const $ = id => document.getElementById(id);
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
const today = () => new Date().toISOString().slice(0, 10);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const fmt = n => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

let editE = null, editS = null;

if ($("ec")) $("ec").innerHTML = CATS.map(c => `<option>${c}</option>`).join("");
if ($("edt")) $("edt").value = today();
if ($("sdt")) $("sdt").value = today();

function go(v) {
  ["home", "exp", "sav", "bud"].forEach(x => {
    const el = $("v-" + x);
    if (el) el.hidden = (x !== v);
  });
  const el = $("v-" + v);
  if (el) {
    el.classList.remove("enter");
    void el.offsetWidth;
    el.classList.add("enter");
  }
  document.querySelectorAll("#nav button").forEach(b => b.classList.toggle("on", b.dataset.v === v));
  window.scrollTo(0, 0);
}

document.querySelectorAll("#nav button").forEach(b => {
  b.onclick = () => go(b.dataset.v);
});

function monthSpent() {
  const m = today().slice(0, 7);
  return S.expenses.filter(e => e.date.startsWith(m)).reduce((a, e) => a + e.amount, 0);
}

function spark() {
  const sp = $("sp");
  if (!sp) return;
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  const mk = arr => days.map(d => arr.filter(x => x.date === d).reduce((a, x) => a + x.amount, 0));
  const a = mk(S.income), b = mk(S.expenses), mx = Math.max(1, ...a, ...b);
  const pts = v => v.map((y, i) => `${i * 300 / 13},${60 - y / mx * 52}`).join(" ");
  sp.innerHTML = `<polyline pathLength="1" class="ln" points="${pts(a)}" fill="none" stroke="#5ee0c7" stroke-width="2.5"/><polyline pathLength="1" class="ln" points="${pts(b)}" fill="none" stroke="#ff7a66" stroke-width="2.5"/>`;
}

function txRow(t) {
  const inc = (t.type === "i");
  return `<div class="item"><div class="ic ${inc ? "in" : "out"}">${inc ? "💰" : EM[t.cat] || "📦"}</div><div class="it"><b>${esc(inc ? t.source : t.cat + " · " + (t.desc || "-"))}</b><div class="mu">${t.date}</div>${t.full ? `<div class="acts"><button class="ghost sm" onclick="${inc ? 'editInc' : 'editExp'}('${t.id}')">Edit</button><button class="ghost sm del" onclick="${inc ? 'delInc' : 'delExp'}('${t.id}')">Delete</button></div>` : ""}</div><div class="amt" style="color:${inc ? "var(--gr)" : "var(--rd)"}">${inc ? "+" : "-"}${fmt(t.amount)}</div></div>`;
}

const _n = {};
function countTo(id, to) {
  const el = $(id);
  if (!el) return;
  const from = _n[id] || 0;
  _n[id] = to;
  if (matchMedia("(prefers-reduced-motion:reduce)").matches || from === to) { el.textContent = fmt(to); return; }
  const t0 = performance.now(), d = 700;
  (function f(t) {
    const k = Math.min(1, (t - t0) / d), e = 1 - Math.pow(1 - k, 3);
    el.textContent = fmt(from + (to - from) * e);
    if (k < 1) requestAnimationFrame(f);
  })(t0);
}

function render() {
  if (!$("bal")) return;
  const inc = S.income.reduce((a, x) => a + x.amount, 0), exp = S.expenses.reduce((a, x) => a + x.amount, 0), bal = inc - exp;
  countTo("bal", bal); countTo("inc", inc); countTo("exp", exp);
  const ms = monthSpent(), al = [];
  if (bal < 0) al.push(`<div class="alert red">⚠️ Balance is negative. You've spent more than your savings.</div>`);
  if (S.limit > 0) {
    const p = ms / S.limit * 100;
    if (p >= 100) al.push(`<div class="alert red">🚨 Monthly limit crossed! Spent ${fmt(ms)} of ${fmt(S.limit)}. Open Budget for AI advice.</div>`);
    else if (p >= 80) al.push(`<div class="alert amb">⚠️ You've used ${Math.round(p)}% of your monthly limit.</div>`);
    if ($("lbar")) { $("lbar").style.width = Math.min(p, 100) + "\%"; $("lbar").style.background = p >= 100 ? "var(--rd)" : p >= 80 ? "var(--am)" : "var(--ac)"; }
    if ($("ltxt")) $("ltxt").textContent = `This month: ${fmt(ms)} / ${fmt(S.limit)} (${Math.round(p)}%)`;
  } else {
    if ($("lbar")) $("lbar").style.width = "0";
    if ($("ltxt")) $("ltxt").textContent = "Set a limit to get overspending alerts.";
  }
  if ($("alerts")) $("alerts").innerHTML = al.join("");
  if ($("lim")) $("lim").value = S.limit || "";
  spark();

  const all = [...S.income.map(x => ({ ...x, type: "i" })), ...S.expenses.map(x => ({ ...x, type: "e" }))].sort((a, b) => b.date.localeCompare(a.date));
  if ($("hist")) $("hist").innerHTML = all.length ? all.slice(0, 8).map(txRow).join("") : `<div class="mu">No transactions yet. Add savings to begin.</div>`;

  const ex = all.filter(t => t.type === "e").map(t => ({ ...t, full: 1 })), sv = all.filter(t => t.type === "i").map(t => ({ ...t, full: 1 }));
  if ($("elist")) $("elist").innerHTML = ex.length ? ex.map(txRow).join("") : `<div class="mu">No expenses yet.</div>`;
  if ($("slist")) $("slist").innerHTML = sv.length ? sv.map(txRow).join("") : `<div class="mu">No savings added yet.</div>`;
}

if ($("esave")) {
  $("esave").onclick = () => {
    const amount = parseFloat($("ea").value);
    if (!(amount > 0)) return alert("Enter a valid amount");
    const o = { id: editE || uid(), amount, cat: $("ec").value, desc: $("ed").value.trim(), date: $("edt").value || today() };
    if (editE) S.expenses = S.expenses.map(x => x.id === editE ? o : x);
    else S.expenses.push(o);
    resetE(); save(); render();
  };
}

function resetE() {
  editE = null; $("ea").value = ""; $("ed").value = ""; $("edt").value = today();
  $("eh").textContent = "Add expense"; $("esave").textContent = "Add expense";
  if ($("ecancel")) $("ecancel").style.display = "none";
}
if ($("ecancel")) $("ecancel").onclick = resetE;

window.editExp = id => {
  const e = S.expenses.find(x => x.id === id);
  editE = id; $("ea").value = e.amount; $("ec").value = e.cat; $("ed").value = e.desc; $("edt").value = e.date;
  $("eh").textContent = "Edit expense"; $("esave").textContent = "Update expense";
  if ($("ecancel")) $("ecancel").style.display = "";
  window.scrollTo(0, 0);
};

window.delExp = id => {
  if (confirm("Delete this expense? The amount returns to your savings.")) {
    S.expenses = S.expenses.filter(x => x.id !== id);
    save(); render();
  }
};

if ($("ssave")) {
  $("ssave").onclick = () => {
    const amount = parseFloat($("sa").value);
    if (!(amount > 0)) return alert("Enter a valid amount");
    const o = { id: editS || uid(), amount, source: $("ss").value.trim() \vert{}\vert{} "Other", date: $("sdt").value || today() };
    if (editS) S.income = S.income.map(x => x.id === editS ? o : x);
    else S.income.push(o);
    resetS(); save(); render();
  };
}

function resetS() {
  editS = null; $("sa").value = ""; $("ss").value = ""; $("sdt").value = today();
  $("sh").textContent = "Add savings / income"; $("ssave").textContent = "Add savings";
  if ($("scancel")) $("scancel").style.display = "none";
}
if ($("scancel")) $("scancel").onclick = resetS;

window.editInc = id => {
  const e = S.income.find(x => x.id === id);
  editS = id; $("sa").value = e.amount; $("ss").value = e.source; $("sdt").value = e.date;
  $("sh").textContent = "Edit savings"; $("ssave").textContent = "Update savings";
  if ($("scancel")) $("scancel").style.display = "";
  window.scrollTo(0, 0);
};

window.delInc = id => {
  if (confirm("Delete this savings entry?")) {
    S.income = S.income.filter(x => x.id !== id);
    save(); render();
  }
};

if ($("lsave")) {
  $("lsave").onclick = () => {
    S.limit = parseFloat($("lim").value) || 0;
    save(); render();
  };
}

function localTips() {
  const m = today().slice(0, 7), by = {};
  S.expenses.filter(e => e.date.startsWith(m)).forEach(e => by[e.cat] = (by[e.cat] || 0) + e.amount);
  const ms = monthSpent(), top = Object.entries(by).sort((a, b) => b[1] - a[1]);
  if (!top.length) return "Add some expenses first and I'll analyse them.";
  let t = `This month you've spent ${fmt(ms)}. Top category: ${top[0][0]} (${fmt(top[0][1])}, ${Math.round(top[0][1] / ms * 100)}%).\n\n• Try cutting ${top[0][0]} spending by 15–20%.\n• Review small repeated purchases.\n• Follow 50/30/20: needs / wants / savings.\n• Wait 24 hours before non-essential purchases.`;
  if (S.limit && ms > S.limit) t += `\n\nYou're over your limit by ${fmt(ms - S.limit)}. Pause non-essential spending for the rest of the month.`;
  return t;
}

if ($("aibtn")) {
  $("aibtn").onclick = async () => {
    const out = $("ai"), btn = $("aibtn");
    if (!S.expenses.length) { out.textContent = "Add some expenses first."; return; }
    btn.disabled = true; out.textContent = "Thinking…";
    const inc = S.income.reduce((a, x) => a + x.amount, 0), exp = S.expenses.reduce((a, x) => a + x.amount, 0);
    const recent = S.expenses.slice(-60).map(e => `${e.date} | ${e.cat} | ${e.desc} | ${e.amount}`).join("\n");
    const prompt = `You are a friendly personal finance coach. Total savings added: ${inc}. Total spent: ${exp}. Balance: ${inc - exp}. Monthly limit: ${S.limit || "not set"}. Spent this month: ${monthSpent()}.\nRecent expenses (date | category | description | amount):\n${recent}\n\nGive short, practical advice: 1) where I'm overspending, 2) which specific expenses to cut or reduce, 3) a realistic plan for the rest of the month. If I crossed my limit, say it clearly. Plain text, short bullets, under 200 words.`;
    try {
      if (typeof claude === "undefined") throw 0;
      const sample = await claude.use("sample");
      if (!sample) throw 0;
      const r = await sample(prompt, { cache: false, onText: ({ text }) => { out.textContent = text; } });
      out.textContent = r.text;
    } catch (e) {
      out.textContent = localTips();
    }
    btn.disabled = false;
  };
}

document.querySelectorAll(".qa button").forEach(b => {
  b.addEventListener("pointermove", e => {
    const r = b.getBoundingClientRect();
    b.style.setProperty("--ry", ((e.clientX - r.left) / r.width - .5) * 26 + "deg");
    b.style.setProperty("--rx", (-((e.clientY - r.top) / r.height - .5)) * 26 + "deg");
  });
  ["pointerleave", "pointerup", "pointercancel"].forEach(ev => b.addEventListener(ev, () => {
    b.style.setProperty("--rx", "0deg");
    b.style.setProperty("--ry", "0deg");
  }));
});

render();
    if (!sample) throw 0;
      const r = await sample(prompt, { cache: false, onText: ({ text }) => { out.textContent = text; } });
      out.textContent = r.text;
    } catch (e) {
      out.textContent = localTips();
    }
    btn.disabled = false;
  };
}

document.querySelectorAll(".qa button").forEach(b => {
  b.addEventListener("pointermove", e => {
    const r = b.getBoundingClientRect();
    b.style.setProperty("--ry", ((e.clientX - r.left) / r.width - .5) * 26 + "deg");
    b.style.setProperty("--rx", (-((e.clientY - r.top) / r.height - .5)) * 26 + "deg");
  });
  ["pointerleave", "pointerup", "pointercancel"].forEach(ev => b.addEventListener(ev, () => {
    b.style.setProperty("--rx", "0deg");
    b.style.setProperty("--ry", "0deg");
  }));
});

render();
