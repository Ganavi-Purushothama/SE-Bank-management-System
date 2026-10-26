const root = document.querySelector("#app");
const dialog = document.querySelector("#transaction-dialog");
const state = {
  me: null,
  tab: "overview",
  page: 1,
  search: "",
  filter: {},
  config: null,
  selected: null,
  pending: null,
};
const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const money = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    Number(value) / 100,
  );
const date = (value) =>
  new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
let noticeTimer;
function notice(message) {
  document.querySelector("#notice").textContent = message;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(
    () => (document.querySelector("#notice").textContent = ""),
    7000,
  );
}
async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(state.me ? { "X-CSRF-Token": state.me.csrfToken } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error(
      "Connection interrupted. Retry the same transaction to check its result safely.",
    );
  }
  const result = await response.json();
  if (!response.ok) {
    if (response.status === 401 && state.me) {
      state.me = null;
      dialog.close();
      renderLogin();
    }
    throw new Error(result.reason || "Request failed");
  }
  return result.data;
}
function field(name, label, type = "text", extra = "") {
  return `<label>${label}<input name="${name}" type="${type}" ${extra}></label>`;
}
function formError(form, error) {
  form.querySelector(".error").textContent = error.message;
}
function busy(form, value) {
  form.querySelectorAll("button").forEach((b) => (b.disabled = value));
  form.setAttribute("aria-busy", String(value));
}
function renderLogin() {
  root.innerHTML = `<main id="main" class="login"><section class="login-story"><div class="brand"><span class="mark">6</span> Bank Six</div><div><div class="eyebrow">A little simpler. Every day.</div><h1>Your money.<br>Your next chapter.</h1><p>A clear view of your account, with the everyday tools you need to keep moving.</p><div class="story-art">BANK SIX<strong>Everyday savings</strong>•••• &nbsp; •••• &nbsp; ••••</div></div><footer>Team 6 · Bank Management System</footer></section><section class="login-form"><div><p class="eyebrow">Welcome to your banking space</p><h1>Good to see you.</h1><p class="muted">Sign in to manage your account.</p><form id="login-form">${field("accountNumber", "Account number or admin login", "text", 'required maxlength="32" autocomplete="username"')}${field("password", "Password", "password", 'required maxlength="128" autocomplete="current-password"')}<p class="error" role="alert"></p><button class="primary">Sign in securely →</button></form><p class="info">Need an account? A bank administrator can open one for you. Locked out? Ask your administrator to unlock access.</p><footer>Academic banking project. Use fictional data only.<br>Never enter credentials from a real bank.</footer></div></section></main>`;
  document.querySelector("#login-form").onsubmit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    busy(form, true);
    try {
      await api("/login", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      state.me = await api("/me");
      state.tab = state.me.role === "ADMIN" ? "accounts" : "overview";
      state.page = 1;
      await render();
    } catch (error) {
      formError(form, error);
    } finally {
      busy(form, false);
    }
  };
}
function frame() {
  const admin = state.me.role === "ADMIN",
    account = state.me.accounts[0];
  const tabs = admin
    ? [
        ["accounts", "Account directory"],
        ["create", "Open an account"],
        ["audit", "Security activity"],
      ]
    : [
        ["overview", "Account overview"],
        ["history", "Transactions"],
        ["profile", "Personal details"],
      ];
  root.innerHTML = `<div class="layout"><aside><div class="brand"><span class="mark">6</span> Bank Six</div><div><p class="eyebrow">${admin ? "Bank operations" : "Your workspace"}</p><nav aria-label="Main navigation">${tabs.map(([id, label]) => `<button data-tab="${id}" class="${state.tab === id ? "active" : ""}" ${state.tab === id ? 'aria-current="page"' : ""}>${label}</button>`).join("")}</nav></div><div class="aside-bottom">Simple, considered banking.<br>Team 6 · Academic project<br>INR · Indian rupees</div></aside><div><header><span class="subtle">${admin ? "Administration / Bank operations" : "Personal banking / Savings"}</span><div class="identity"><span class="avatar">${admin ? "BS" : escape(account?.name?.charAt(0) || "C")}</span><small>${admin ? "Administrator" : escape(account?.name)}</small><button id="logout">Sign out</button></div></header><main id="main" class="content" tabindex="-1"><div class="loading" role="status">Loading your banking workspace…</div></main></div></div>`;
  root.querySelectorAll("[data-tab]").forEach(
    (button) =>
      (button.onclick = () => {
        state.tab = button.dataset.tab;
        state.page = 1;
        state.selected = null;
        render();
      }),
  );
  document.querySelector("#logout").onclick = async () => {
    try {
      await api("/logout", { method: "POST", body: "{}" });
      state.me = null;
      state.pending = null;
      renderLogin();
    } catch (error) {
      notice(error.message);
    }
  };
}
function heading(title, subtitle) {
  return `<div class="heading"><div><p class="eyebrow">${state.me.role === "ADMIN" ? "Bank operations" : "Your everyday banking"}</p><h1>${title}</h1><p class="muted">${subtitle}</p></div><span class="pill">${state.me.role === "ADMIN" ? "ADMIN PORTAL" : "CUSTOMER PORTAL"}</span></div>`;
}
function historyTable(items) {
  if (!items.length)
    return '<p class="empty">No transactions match this view.</p>';
  return `<div class="table-wrap"><table><thead><tr><th>Transaction</th><th>Date & time</th><th>Status</th><th>Amount</th><th>Balance after</th></tr></thead><tbody>${items.map((item) => `<tr><td>${escape(item.type)}<br><small>${escape(item.id.slice(0, 8))}</small></td><td>${escape(date(item.created_at))}</td><td><span class="pill">Committed</span></td><td class="${["DEPOSIT", "OPENING"].includes(item.type) ? "positive" : "negative"}">${["DEPOSIT", "OPENING"].includes(item.type) ? "+" : "−"} ${money(item.amount)}</td><td>${money(item.balance_after)}</td></tr>`).join("")}</tbody></table></div>`;
}
function pagination(data) {
  return `<div class="pagination"><button id="previous" ${data.page <= 1 ? "disabled" : ""}>← Previous</button><small>Page ${data.page} · ${data.total} records</small><button id="next" ${data.page * data.pageSize >= data.total ? "disabled" : ""}>Next →</button></div>`;
}
function bindPagination() {
  const prev = document.querySelector("#previous"),
    next = document.querySelector("#next");
  if (prev)
    prev.onclick = () => {
      state.page--;
      render();
    };
  if (next)
    next.onclick = () => {
      state.page++;
      render();
    };
}
function details(account) {
  return `<dl class="details"><div><dt>Account holder</dt><dd>${escape(account.name)}</dd></div><div><dt>Account number</dt><dd>${escape(account.number)}</dd></div><div><dt>Account type</dt><dd>Savings · INR</dd></div><div><dt>Status</dt><dd>${escape(account.status)}</dd></div><div><dt>Opened on</dt><dd>${escape(new Date(account.created_at).toLocaleDateString("en-IN"))}</dd></div><div><dt>Available balance</dt><dd>${money(Math.max(0, account.balance - state.config.minBalance))}</dd></div></dl>`;
}
async function customer(main) {
  const id = state.me.accounts[0].id;
  const account = await api(`/accounts/${id}`);
  state.me.accounts = [account];
  if (state.tab === "overview") {
    const history = await api(`/accounts/${id}/transactions`);
    main.innerHTML =
      heading(
        `Hello, ${escape(account.name.split(" ")[0])}.`,
        "A clear view of where you stand today.",
      ) +
      `<div class="grid"><section class="card balance"><p class="muted">TOTAL ACCOUNT BALANCE</p><div class="amount">${money(account.balance)}</div><div class="balance-footer"><span>SAVINGS &nbsp; · &nbsp; ${escape(account.number)}</span><span class="pill">Active</span></div></section><section class="card"><h2>Move your money</h2><p class="muted">Make a deposit or withdraw available funds.</p><div class="actions"><button class="primary" id="deposit">↓ Deposit</button><button id="withdraw">↑ Withdraw</button></div><p class="subtle">Minimum retained balance: ${money(state.config.minBalance)}</p></section></div><section class="card"><h2>Your account at a glance</h2>${details(account)}</section><section class="card"><div class="card-top"><h2>Recent activity</h2><button id="all-history">View all transactions →</button></div>${historyTable(history.items.slice(0, 5))}</section>`;
    document.querySelector("#deposit").onclick = () => transaction("deposit");
    document.querySelector("#withdraw").onclick = () => transaction("withdraw");
    document.querySelector("#all-history").onclick = () => {
      state.tab = "history";
      render();
    };
  } else if (state.tab === "history") {
    const params = new URLSearchParams({ page: state.page, ...state.filter });
    const history = await api(`/accounts/${id}/transactions?${params}`);
    main.innerHTML =
      heading(
        "Transaction history",
        "Your committed account activity, all in one place.",
      ) +
      `<section class="card"><form id="filters" class="filters"><label>Transaction type<select name="type"><option value="">All transactions</option>${["DEPOSIT", "WITHDRAW", "OPENING", "SETTLEMENT"].map((type) => `<option ${state.filter.type === type ? "selected" : ""}>${type}</option>`).join("")}</select></label>${field("from", "From date", "date", `value="${escape(state.filter.from || "")}"`)}${field("to", "To date", "date", `value="${escape(state.filter.to || "")}"`)}<button class="primary">Apply filters</button></form><p class="subtle">Date filters use UTC. Displayed times use your browser's timezone.</p>${historyTable(history.items)}${pagination(history)}</section>`;
    document.querySelector("#filters").onsubmit = (event) => {
      event.preventDefault();
      state.filter = Object.fromEntries(
        [...new FormData(event.currentTarget)].filter(([, v]) => v),
      );
      state.page = 1;
      render();
    };
    bindPagination();
  } else {
    main.innerHTML =
      heading("Personal details", "Keep your account information up to date.") +
      `<section class="card"><h2>Contact information</h2><form id="profile" class="form-grid">${field("name", "Full name", "text", `required maxlength="100" value="${escape(account.name)}"`)}${field("phone", "Phone", "tel", `maxlength="30" value="${escape(account.phone)}"`)}<label class="span-2">Address<textarea name="address" maxlength="300" rows="3">${escape(account.address)}</textarea></label><p class="error span-2" role="alert"></p><div><button class="primary">Save changes</button></div></form></section>`;
    document.querySelector("#profile").onsubmit = async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      busy(form, true);
      try {
        await api(`/accounts/${id}`, {
          method: "PATCH",
          body: JSON.stringify(Object.fromEntries(new FormData(form))),
        });
        notice("Your details have been updated.");
        await render();
      } catch (error) {
        formError(form, error);
      } finally {
        busy(form, false);
      }
    };
  }
}
function transaction(operation) {
  const label = operation === "deposit" ? "Deposit" : "Withdraw";
  dialog.innerHTML = `<p class="eyebrow">${escape(state.me.accounts[0].number)}</p><h2 id="transaction-title">${label} funds</h2><p class="muted">Enter the amount in Indian rupees.</p><form id="transaction-form">${field("amount", "Amount (INR)", "text", 'required inputmode="decimal" pattern="[0-9]+(\\.[0-9]{1,2})?" maxlength="14" placeholder="0.00"')}<p class="info" id="review">You will review the amount before confirming.</p><p class="error" role="alert"></p><div class="actions"><button type="button" id="cancel">Cancel</button><button class="primary" id="confirm">Review ${operation}</button></div></form>`;
  dialog.showModal();
  const form = document.querySelector("#transaction-form");
  let reviewed = "";
  const input = form.elements.amount;
  input.oninput = () => {
    reviewed = "";
    document.querySelector("#confirm").textContent = `Review ${operation}`;
  };
  document.querySelector("#cancel").onclick = () => dialog.close();
  form.onsubmit = async (event) => {
    event.preventDefault();
    const value = input.value;
    if (!/^(0|[1-9]\d{0,10})(\.\d{1,2})?$/.test(value) || Number(value) <= 0) {
      formError(
        form,
        new Error("Enter a positive amount with at most two decimal places."),
      );
      return;
    }
    if (reviewed !== value) {
      reviewed = value;
      document.querySelector("#review").textContent =
        `Confirm ${operation} of ₹${value} for account ${state.me.accounts[0].number}.`;
      document.querySelector("#confirm").textContent = `Confirm ${operation}`;
      return;
    }
    busy(form, true);
    const fingerprint = `${state.me.accounts[0].id}:${operation}:${value}`;
    if (state.pending?.fingerprint !== fingerprint)
      state.pending = { fingerprint, key: crypto.randomUUID() };
    try {
      await api(`/accounts/${state.me.accounts[0].id}/${operation}`, {
        method: "POST",
        headers: { "Idempotency-Key": state.pending.key },
        body: JSON.stringify({ amount: value }),
      });
      state.pending = null;
      dialog.close();
      notice(`${label} committed successfully.`);
      await render();
    } catch (error) {
      formError(form, error);
    } finally {
      busy(form, false);
    }
  };
}
async function admin(main) {
  if (state.tab === "create") {
    main.innerHTML =
      heading(
        "Open a new account",
        "A fresh start, with the right details from day one.",
      ) +
      `<section class="card"><h2>Customer & account details</h2><p class="info">Minimum opening deposit: ${money(state.config.minInitial)}. Share the generated account number and temporary password with the fictional customer securely.</p><form id="create" class="form-grid">${field("name", "Full name", "text", 'required maxlength="100"')}${field("phone", "Phone", "tel", 'maxlength="30"')}<label class="span-2">Address<textarea name="address" maxlength="300" rows="3"></textarea></label>${field("initialDeposit", "Opening deposit (INR)", "text", 'required inputmode="decimal" pattern="[0-9]+(\\.[0-9]{1,2})?"')}${field("password", "Customer password (12–128 bytes)", "password", 'required minlength="12" maxlength="128" autocomplete="new-password"')}<p class="error span-2" role="alert"></p><div><button class="primary">Create savings account →</button></div></form></section>`;
    document.querySelector("#create").onsubmit = async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      busy(form, true);
      try {
        const account = await api("/admin/accounts", {
          method: "POST",
          body: JSON.stringify(Object.fromEntries(new FormData(form))),
        });
        form.reset();
        notice(`Account created: ${account.number}`);
        state.tab = "accounts";
        state.search = account.number;
        await render();
      } catch (error) {
        formError(form, error);
      } finally {
        busy(form, false);
      }
    };
  } else if (state.tab === "audit") {
    const data = await api(`/admin/audit?page=${state.page}`);
    main.innerHTML =
      heading(
        "Security activity",
        "Authentication and account administration events.",
      ) +
      `<section class="card"><div class="table-wrap"><table><thead><tr><th>Event</th><th>Time</th><th>Actor / account reference</th></tr></thead><tbody>${data.items.map((item) => `<tr><td class="audit-event">${escape(item.event)}</td><td>${escape(date(item.created_at))}</td><td><small>${escape(item.actor_id || "Unknown")}<br>${escape(item.account_id || "—")}</small></td></tr>`).join("")}</tbody></table></div>${!data.items.length ? '<p class="empty">No security events recorded.</p>' : ""}${pagination(data)}</section>`;
    bindPagination();
  } else {
    const data = await api(
      `/admin/accounts?${new URLSearchParams({ search: state.search, page: state.page })}`,
    );
    main.innerHTML =
      heading(
        "Account directory",
        "Find customers, review accounts, and manage access.",
      ) +
      `<section class="card"><form id="search" class="filters">${field("search", "Search by name or account number", "search", `maxlength="100" value="${escape(state.search)}"`)}<button class="primary">Search accounts</button></form><div class="table-wrap"><table><thead><tr><th>Customer</th><th>Account</th><th>Balance</th><th>Status</th><th>Actions</th></tr></thead><tbody>${data.items.map((account) => `<tr><td>${escape(account.name)}</td><td>${escape(account.number)}</td><td>${money(account.balance)}</td><td><span class="pill ${account.status === "CLOSED" ? "closed" : ""}">${account.locked ? "LOCKED · " : ""}${escape(account.status)}</span></td><td><div class="actions"><button data-view="${account.id}">Details</button>${account.status === "ACTIVE" ? `${account.locked ? `<button data-unlock="${account.id}">Unlock</button>` : ""}<button class="danger" data-close="${account.id}">Close</button>` : ""}</div></td></tr>`).join("")}</tbody></table></div>${!data.items.length ? '<p class="empty">No accounts found. Try another search or open an account.</p>' : ""}${pagination(data)}</section><div id="inspection"></div>`;
    document.querySelector("#search").onsubmit = (event) => {
      event.preventDefault();
      state.search = event.currentTarget.elements.search.value;
      state.page = 1;
      render();
    };
    bindPagination();
    main.querySelectorAll("[data-view]").forEach(
      (button) =>
        (button.onclick = async () => {
          try {
            const account = await api(`/accounts/${button.dataset.view}`);
            const history = await api(`/accounts/${account.id}/transactions`);
            document.querySelector("#inspection").innerHTML =
              `<section class="card account-inspect"><h2>${escape(account.name)}</h2>${details(account)}<p class="subtle">Phone: ${escape(account.phone || "Not provided")}<br>Address: ${escape(account.address || "Not provided")}</p><h2>Latest transactions</h2>${historyTable(history.items)}</section>`;
            document
              .querySelector("#inspection")
              .scrollIntoView({ behavior: "smooth" });
          } catch (error) {
            notice(error.message);
          }
        }),
    );
    main.querySelectorAll("[data-unlock]").forEach(
      (button) =>
        (button.onclick = async () => {
          button.disabled = true;
          try {
            await api(`/admin/accounts/${button.dataset.unlock}/unlock`, {
              method: "POST",
              body: "{}",
            });
            notice("Account access unlocked.");
            await render();
          } catch (error) {
            notice(error.message);
            button.disabled = false;
          }
        }),
    );
    main
      .querySelectorAll("[data-close]")
      .forEach(
        (button) =>
          (button.onclick = () =>
            closeAccount(
              data.items.find((account) => account.id === button.dataset.close),
            )),
      );
  }
}
function closeAccount(account) {
  dialog.innerHTML = `<p class="eyebrow">Account administration</p><h2 id="transaction-title">Close and settle account</h2><p>This permanently closes ${escape(account.number)}, invalidates its sessions, and records a settlement of <strong>${money(account.balance)}</strong>. Confirm the fictional payout has been authorized. Ledger records remain available to administrators.</p><form id="close-form">${field("confirmAccountNumber", "Type the account number to confirm", "text", 'required autocomplete="off"')}<p class="error" role="alert"></p><div class="actions"><button type="button" id="cancel">Cancel</button><button class="danger">Close & settle</button></div></form>`;
  dialog.showModal();
  document.querySelector("#cancel").onclick = () => dialog.close();
  document.querySelector("#close-form").onsubmit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    busy(form, true);
    try {
      await api(`/admin/accounts/${account.id}/close`, {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      dialog.close();
      notice("Account closed and settlement recorded.");
      await render();
    } catch (error) {
      formError(form, error);
    } finally {
      busy(form, false);
    }
  };
}
let renderVersion = 0;
async function render() {
  const version = ++renderVersion;
  if (!state.me) return renderLogin();
  frame();
  const main = document.querySelector("#main");
  try {
    if (!state.config) state.config = await api("/config");
    if (state.me.role === "ADMIN") await admin(main);
    else await customer(main);
  } catch (error) {
    if (state.me && version === renderVersion) {
      main.innerHTML = `<section class="card"><h1>We couldn't load this view.</h1><p class="error">${escape(error.message)}</p><button id="retry">Try again</button></section>`;
      main.querySelector("#retry").onclick = render;
    }
  }
}
try {
  state.me = await api("/me");
  state.tab = state.me.role === "ADMIN" ? "accounts" : "overview";
  await render();
} catch {
  renderLogin();
}
