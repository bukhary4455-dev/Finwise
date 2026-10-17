
"use strict";

(() => {
  const CATS = [
    "Food", "Transport", "Bills", "Shopping", "Health",
    "Entertainment", "Education", "Rent", "Other"
  ];

  const EM = {
    Food: "🍔",
    Transport: "🚌",
    Bills: "🧾",
    Shopping: "🛍️",
    Health: "💊",
    Entertainment: "🎬",
    Education: "📚",
    Rent: "🏠",
    Other: "📦"
  };

  const KEY = "exp_tracker_v1";
  let S = { income: [], expenses: [], limit: 0 };
  let editE = null;
  let editS = null;
  const animationValues = {};

  const $ = id => document.getElementById(id);

  function today() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function uid() {
    return Date.now().toString(36) +
      Math.random().toString(36).slice(2, 9);
  }

  function fmt(n) {
    return Number(n || 0).toLocaleString(undefined, {
      maximumFractionDigits: 2
    });
  }

  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[c]);
  }

  function notify(message) {
    alert(message);
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(S));
    } catch (error) {
      console.error("Could not save data:", error);
      notify("Data could not be saved. Check browser storage settings.");
    }
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;

      const data = JSON.parse(raw);

      S.income = Array.isArray(data.income) ? data.income : [];
      S.expenses = Array.isArray(data.expenses) ? data.expenses : [];
      S.limit = Math.max(0, Number(data.limit) || 0);

      S.income = S.income
        .filter(x =>
          x && typeof x === "object" &&
          Number.isFinite(Number(x.amount)) &&
          Number(x.amount) > 0
        )
        .map(x => ({
          ...x,
          amount: Number(x.amount),
          source: String(x.source || "Other"),
          date: String(x.date || today()),
          id: String(x.id || uid())
        }));

      S.expenses = S.expenses
        .filter(x =>
          x && typeof x === "object" &&
          Number.isFinite(Number(x.amount)) &&
          Number(x.amount) > 0
        )
        .map(x => ({
          ...x,
          amount: Number(x.amount),
          cat: CATS.includes(x.cat) ? x.cat : "Other",
          desc: String(x.desc || ""),
          date: String(x.date || today()),
          id: String(x.id || uid())
        }));
    } catch (error) {
      console.error("Could not load saved data:", error);
      notify("Saved data could not be read. Check the browser console.");
    }
  }

  function init() {
    load();

    if ($("ec")) {
      $("ec").innerHTML = CATS.map(c =>
        `<option value="${c}">${c}</option>`
      ).join("");
    }

    if ($("edt") && !$("edt").value) $("edt").value = today();
    if ($("sdt") && !$("sdt").value) $("sdt").value = today();

    document.querySelectorAll("#nav button").forEach(button => {
      button.addEventListener("click", () => {
        go(button.dataset.v);
      });
    });

    if ($("esave")) $("esave").addEventListener("click", saveExpense);
    if ($("ecancel")) $("ecancel").addEventListener("click", resetE);

    if ($("ssave")) $("ssave").addEventListener("click", saveIncome);
    if ($("scancel")) $("scancel").addEventListener("click", resetS);

    if ($("lsave")) {
      $("lsave").addEventListener("click", () => {
        const value = Number($("lim")?.value || 0);

        if (!Number.isFinite(value) || value < 0) {
          notify("Enter a valid budget limit.");
          return;
        }

        S.limit = value;
        save();
        render();
        notify("Monthly budget limit saved.");
      });
    }

    if ($("aibtn")) {
      $("aibtn").addEventListener("click", getAdvice);
    }

    document.querySelectorAll(".qa button").forEach(button => {
      button.addEventListener("pointermove", event => {
        const rect = button.getBoundingClientRect();
        if (!rect.width || !rect.height) return;

        button.style.setProperty(
          "--ry",
          ((event.clientX - rect.left) / rect.width - 0.5) * 26 + "deg"
        );

        button.style.setProperty(
          "--rx",
          -((event.clientY - rect.top) / rect.height - 0.5) * 26 + "deg"
        );
      });

      ["pointerleave", "pointerup", "pointercancel"].forEach(name => {
        button.addEventListener(name, () => {
          button.style.setProperty("--rx", "0deg");
          button.style.setProperty("--ry", "0deg");
        });
      });
    });

    window.go = go;
    window.editExp = editExp;
    window.delExp = delExp;
    window.editInc = editInc;
    window.delInc = delInc;

    render();

    if (!$("nav")) {
      console.warn('Navigation element "#nav" was not found.');
    }
  }

  function go(view) {
    const views = ["home", "exp", "sav", "bud"];

    if (!views.includes(view)) {
      console.warn("Unknown view:", view);
      return;
    }

    views.forEach(name => {
      const el = $("v-" + name);
      if (el) el.hidden = name !== view;
    });

    const active = $("v-" + view);

    if (active) {
      active.classList.remove("enter");
      void active.offsetWidth;
      active.classList.add("enter");
    }

    document.querySelectorAll("#nav button").forEach(button => {
      button.classList.toggle("on", button.dataset.v === view);
    });

    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function monthSpent() {
    const month = today().slice(0, 7);

    return S.expenses
      .filter(e => String(e.date).slice(0, 7) === month)
      .reduce((sum, e) => sum + e.amount, 0);
  }

  function countTo(id, target) {
    const el = $(id);
    if (!el) return;

    const from = animationValues[id] ?? 0;
    animationValues[id] = target;

    if (
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ||
      from === target ||
      typeof requestAnimationFrame !== "function"
    ) {
      el.textContent = fmt(target);
      return;
    }

    const start = performance.now();
    const duration = 450;

    function step(now) {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);

      el.textContent = fmt(from + (target - from) * eased);

      if (progress < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }

  function spark() {
    const svg = $("sp");
    if (!svg) return;

    const days = [];

    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);

      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");

      days.push(`${y}-${m}-${day}`);
    }

    const totals = records => days.map(date =>
      records
        .filter(item => item.date === date)
        .reduce((sum, item) => sum + item.amount, 0)
    );

    const income = totals(S.income);
    const expenses = totals(S.expenses);
    const max = Math.max(1, ...income, ...expenses);

    const points = values => values.map((value, i) =>
      `${i * 300 / 13},${60 - value / max * 52}`
    ).join(" ");

    svg.innerHTML = `
      <polyline class="ln"
        points="${points(income)}"
        fill="none" stroke="#5ee0c7" stroke-width="2.5"/>
      <polyline class="ln"
        points="${points(expenses)}"
        fill="none" stroke="#ff7a66" stroke-width="2.5"/>
    `;
  }

  function txRow(t) {
    const isIncome = t.type === "i";

    const title = isIncome
      ? esc(t.source || "Other")
      : esc((t.cat || "Other") + " · " + (t.desc || "-"));

    const actions = t.full ? `
      <div class="acts">
        <button type="button" class="ghost sm"
          onclick="${isIncome ? "editInc" : "editExp"}('${esc(t.id)}')">
          Edit
        </button>
        <button type="button" class="ghost sm del"
          onclick="${isIncome ? "delInc" : "delExp"}('${esc(t.id)}')">
          Delete
        </button>
      </div>
    ` : "";

    return `
      <div class="item">
        <div class="ic ${isIncome ? "in" : "out"}">
          ${isIncome ? "💰" : (EM[t.cat] || "📦")}
        </div>
        <div class="it">
          <b>${title}</b>
          <div class="mu">${esc(t.date)}</div>
          ${actions}
        </div>
        <div class="amt"
          style="color:${isIncome ? "var(--gr)" : "var(--rd)"}">
          ${isIncome ? "+" : "-"}${fmt(t.amount)}
        </div>
      </div>
    `;
  }

  function render() {
    const incomeTotal = S.income.reduce((sum, x) => sum + x.amount, 0);
    const expenseTotal = S.expenses.reduce((sum, x) => sum + x.amount, 0);
    const balance = incomeTotal - expenseTotal;
    const spent = monthSpent();
    const alerts = [];

    countTo("bal", balance);
    countTo("inc", incomeTotal);
    countTo("exp", expenseTotal);

    if (balance < 0) {
      alerts.push(`
        <div class="alert red">
          ⚠️ Your balance is negative. Spending exceeds recorded income.
        </div>
      `);
    }

    if (S.limit > 0) {
      const percentage = spent / S.limit * 100;

      if (percentage >= 100) {
        alerts.push(`
          <div class="alert red">
            🚨 Monthly budget crossed! Spent ${fmt(spent)} of ${fmt(S.limit)}.
          </div>
        `);
      } else if (percentage >= 80) {
        alerts.push(`
          <div class="alert amb">
            ⚠️ You've used ${Math.round(percentage)}% of your monthly budget.
          </div>
        `);
      }

      if ($("lbar")) {
        $("lbar").style.width = Math.min(percentage, 100) + "%";
        $("lbar").style.background =
          percentage >= 100 ? "var(--rd)" :
          percentage >= 80 ? "var(--am)" : "var(--ac)";
      }

      if ($("ltxt")) {
        $("ltxt").textContent =
          `This month: ${fmt(spent)} / ${fmt(S.limit)} (${Math.round(percentage)}%)`;
      }
    } else {
      if ($("lbar")) $("lbar").style.width = "0%";
      if ($("ltxt")) {
        $("ltxt").textContent = "Set a limit to get overspending alerts.";
      }
    }

    if ($("alerts")) $("alerts").innerHTML = alerts.join("");
    if ($("lim")) $("lim").value = S.limit || "";

    spark();

    const all = [
      ...S.income.map(x => ({ ...x, type: "i" })),
      ...S.expenses.map(x => ({ ...x, type: "e" }))
    ].sort((a, b) => String(b.date).localeCompare(String(a.date)));

    if ($("hist")) {
      $("hist").innerHTML = all.length
        ? all.slice(0, 8).map(txRow).join("")
        : `<div class="mu">No transactions yet. Add savings to begin.</div>`;
    }

    const expenses = all
      .filter(x => x.type === "e")
      .map(x => ({ ...x, full: true }));

    const income = all
      .filter(x => x.type === "i")
      .map(x => ({ ...x, full: true }));

    if ($("elist")) {
      $("elist").innerHTML = expenses.length
        ? expenses.map(txRow).join("")
        : `<div class="mu">No expenses yet.</div>`;
    }

    if ($("slist")) {
      $("slist").innerHTML = income.length
        ? income.map(txRow).join("")
        : `<div class="mu">No savings added yet.</div>`;
    }
  }

  function saveExpense() {
    const amount = Number($("ea")?.value);

    if (!Number.isFinite(amount) || amount <= 0) {
      notify("Enter a valid expense amount.");
      return;
    }

    const date = $("edt")?.value || today();

    if (!date) {
      notify("Please select an expense date.");
      return;
    }

    const category = $("ec")?.value || "Other";

    const record = {
      id: editE || uid(),
      amount,
      cat: CATS.includes(category) ? category : "Other",
      desc: $("ed")?.value.trim() || "",
      date
    };

    if (editE) {
      S.expenses = S.expenses.map(x =>
        x.id === editE ? record : x
      );
    } else {
      S.expenses.push(record);
    }

    resetE();
    save();
    render();
  }

  function resetE() {
    editE = null;

    if ($("ea")) $("ea").value = "";
    if ($("ed")) $("ed").value = "";
    if ($("edt")) $("edt").value = today();

    if ($("eh")) $("eh").textContent = "Add expense";
    if ($("esave")) $("esave").textContent = "Add expense";
    if ($("ecancel")) $("ecancel").style.display = "none";
  }

  function editExp(id) {
    const record = S.expenses.find(x => x.id === id);
    if (!record) return notify("Expense not found.");

    editE = id;

    if ($("ea")) $("ea").value = record.amount;
    if ($("ec")) $("ec").value = record.cat;
    if ($("ed")) $("ed").value = record.desc;
    if ($("edt")) $("edt").value = record.date;

    if ($("eh")) $("eh").textContent = "Edit expense";
    if ($("esave")) $("esave").textContent = "Update expense";
    if ($("ecancel")) $("ecancel").style.display = "";

    go("exp");
  }

  function delExp(id) {
    const record = S.expenses.find(x => x.id === id);
    if (!record) return;

    if (!confirm("Delete this expense?")) return;

    S.expenses = S.expenses.filter(x => x.id !== id);
    save();
    render();
  }

  function saveIncome() {
    const amount = Number($("sa")?.value);

    if (!Number.isFinite(amount) || amount <= 0) {
      notify("Enter a valid savings / income amount.");
      return;
    }

    const record = {
      id: editS || uid(),
      amount,
      source: $("ss")?.value.trim() || "Other",
      date: $("sdt")?.value || today()
    };

    if (editS) {
      S.income = S.income.map(x =>
        x.id === editS ? record : x
      );
    } else {
      S.income.push(record);
    }

    resetS();
    save();
    render();
  }

  function resetS() {
    editS = null;

    if ($("sa")) $("sa").value = "";
    if ($("ss")) $("ss").value = "";
    if ($("sdt")) $("sdt").value = today();

    if ($("sh")) $("sh").textContent = "Add savings / income";
    if ($("ssave")) $("ssave").textContent = "Add savings";
    if ($("scancel")) $("scancel").style.display = "none";
  }

  function editInc(id) {
    const record = S.income.find(x => x.id === id);
    if (!record) return notify("Savings entry not found.");

    editS = id;

    if ($("sa")) $("sa").value = record.amount;
    if ($("ss")) $("ss").value = record.source;
    if ($("sdt")) $("sdt").value = record.date;

    if ($("sh")) $("sh").textContent = "Edit savings";
    if ($("ssave")) $("ssave").textContent = "Update savings";
    if ($("scancel")) $("scancel").style.display = "";

    go("sav");
  }

  function delInc(id) {
    const record = S.income.find(x => x.id === id);
    if (!record) return;

    if (!confirm("Delete this savings / income entry?")) return;

    S.income = S.income.filter(x => x.id !== id);
    save();
    render();
  }

  function localTips() {
    const month = today().slice(0, 7);
    const categories = {};

    S.expenses
      .filter(x => String(x.date).slice(0, 7) === month)
      .forEach(x => {
        categories[x.cat] = (categories[x.cat] || 0) + x.amount;
      });

    const spent = monthSpent();
    const top = Object.entries(categories)
      .sort((a, b) => b[1] - a[1]);

    if (!top.length) {
      return "Add expenses for this month first, then request advice.";
    }

    let advice =
      `This month you've spent ${fmt(spent)}.\n` +
      `Highest spending category: ${top[0][0]} ` +
      `(${fmt(top[0][1])}, ${Math.round(top[0][1] / spent * 100)}%).\n\n` +
      `• Try reducing ${top[0][0]} spending by 10–15%.\n` +
      `• Review small, repeated purchases.\n` +
      `• Separate needs from wants before spending.\n` +
      `• Set aside savings before non-essential purchases.`;

    if (S.limit > 0 && spent > S.limit) {
      advice +=
        `\n\nYou are over your monthly limit by ${fmt(spent - S.limit)}. ` +
        "Pause non-essential spending where possible.";
    } else if (S.limit > 0) {
      advice +=
        `\n\nRemaining monthly budget: ${fmt(S.limit - spent)}.`;
    }

    return advice;
  }

  async function getAdvice() {
    const out = $("ai");
    const button = $("aibtn");

    if (!out || !button) return;

    if (!S.expenses.length) {
      out.textContent = "Add some expenses first.";
      return;
    }

    button.disabled = true;
    out.textContent = "Analysing your expenses...";

    try {
      if (
        typeof claude !== "undefined" &&
        typeof claude.use === "function"
      ) {
        const income = S.income.reduce((a, x) => a + x.amount, 0);
        const expenses = S.expenses.reduce((a, x) => a + x.amount, 0);

        const recent = S.expenses.slice(-60).map(x =>
          `${x.date} | ${x.cat} | ${x.desc} | ${x.amount}`
        ).join("\n");

        const prompt =
          `You are a friendly personal finance coach.\n` +
          `Total recorded income: ${income}.\n` +
          `Total expenses: ${expenses}.\n` +
          `Balance: ${income - expenses}.\n` +
          `Monthly limit: ${S.limit || "not set"}.\n` +
          `Spent this month: ${monthSpent()}.\n` +
          `Recent expenses:\n${recent}\n\n` +
          `Give practical advice in fewer than 200 words.`;

        const sample = await claude.use("sample");

        if (typeof sample === "function") {
          const result = await sample(prompt, { cache: false });

          if (result && result.text) {
            out.textContent = result.text;
            return;
          }
        }
      }

      out.textContent = localTips();
    } catch (error) {
      console.error("AI advice unavailable:", error);
      out.textContent = localTips();
    } finally {
      button.disabled = false;
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
