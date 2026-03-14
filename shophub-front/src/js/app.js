// src/js/app.js
// ShopHub Frontend (real auth integration)
// Backend endpoints assumed:
// POST   /api/auth/login  -> { token, user: { Id, Email, Role } }
// GET    /api/auth/me     -> { user: { id, email, role } }
// Products (optional for now):
// GET    /api/products
// GET    /api/products/:id
const API_BASE = (import.meta.env.VITE_API_BASE || "http://localhost:5000/api").replace(/\/$/, "").replace(/\/api$/, "");
const ORDER_STATUSES = ["pending", "paid", "shipped", "delivered", "cancelled"];
// Small helpers
const $ = (id) => document.getElementById(id);

function safeJsonParse(str, fallback = null) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}
function formatMoneyAZN(x) {
  const n = Number(x || 0);
  return `₼${n.toFixed(2)}`;
}
function normalizeRole(role) {
  // backend /login -> "Role" gələ bilər, /me -> "role"
  if (!role) return "";
  return String(role).trim().toLowerCase();
}

function showToast({ title, message, type = "success" }) {
  const toast = document.getElementById("toast");
  const toastTitle = document.getElementById("toastTitle");
  const toastMsg = document.getElementById("toastMsg");
  const toastIcon = document.getElementById("toastIcon");

  // Məlumatları doldururuq
  toastTitle.innerText = title;
  toastMsg.innerText = message;

  // Tipə görə rəng və ikon dəyişirik
  if (type === "success") {
    toastIcon.innerHTML = "✓"; // Uğur ikonu
    toastIcon.className =
      "w-10 h-10 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center text-xl";
  } else {
    toastIcon.innerHTML = "✕"; // Xəta ikonu
    toastIcon.className =
      "w-10 h-10 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center text-xl";
  }

  // Toast-u göstəririk
  toast.classList.remove("hidden");
  toast.classList.add("flex"); // Tailwind-də flex olmalıdır ki, elementlər düzülsün

  // 4 saniyə sonra gizlədirik
  setTimeout(() => {
    toast.classList.add("hidden");
    toast.classList.remove("flex");
  }, 4000);
}

// Auth storage
const AUTH_KEY = "shophub_auth_v1";
const THEME_KEY = "shophub_theme";

function applyTheme(theme) {
  const next = theme === "dark" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem(THEME_KEY, next);
  const themeBtn = document.getElementById("themeToggle");
  if (themeBtn) {
    themeBtn.textContent = next === "dark" ? "☀" : "☾";
    themeBtn.setAttribute("aria-label", next === "dark" ? "Switch to light mode" : "Switch to dark mode");
  }
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(saved || (prefersDark ? "dark" : "light"));
}

function getAuth() {
  return safeJsonParse(localStorage.getItem(AUTH_KEY), null);
}
function setAuth(auth) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
}
function clearAuth() {
  localStorage.removeItem(AUTH_KEY);
}

function getToken() {
  return getAuth()?.token || null;
}

function getUserFromAuth() {
  return getAuth()?.user || null;
}

// API client
async function apiFetch(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    cache: "no-store", // ✅ bunu əlavə et
    body: body ? JSON.stringify(body) : undefined,
  });

  // try parse
  const text = await res.text();
  const data = text ? safeJsonParse(text, text) : null;

  if (!res.ok) {
    const msg =
      (data && typeof data === "object" && (data.message || data.error)) ||
      (typeof data === "string" ? data : "") ||
      `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

// Session state
const state = {
  sessionUser: null, // normalized { id, email, role }
  products: [],
  cart: [], // [{ productId, qty, productSnapshot }]
  adminOrders: [],
  adminUsers: [],
};

// UI: view switch
function showView(name) {
  const shop = $("viewShop");
  if (!shop) return;


  if (name === "shop") {
    shop.classList.remove("hidden");
  }
}

// UI: auth rendering
// In updateAuthUI(), update the authBtn behavior:
// --- Auth UI update (replace existing updateAuthUI implementation) ---
function updateAuthUI() {
  const authBtn = $("authBtn");
  const authBtnLabel = $("authBtnLabel");
  const accountWrap = $("accountWrap");
  const accountBtn = $("accountBtn");
  const accountDropdown = $("accountDropdown");
  const accountEmail = $("accountEmail");
  const logoutBtnEl = $("logoutBtn");
  const user = state.sessionUser;

  // ensure dropdown closed by default
  if (accountDropdown) accountDropdown.classList.add("hidden");

  if (user) {
    // hide login link, show account icon
    if (authBtn) authBtn.classList.add("hidden");
    if (accountWrap) accountWrap.classList.remove("hidden");
    if (accountEmail) {
      accountEmail.textContent = user.email || "";
      accountEmail.title = user.email || "";
    }
    // wire logout button
    if (logoutBtnEl) {
      logoutBtnEl.onclick = async () => {
        await doLogout();
        // ensure dropdown hidden after logout
        accountDropdown && accountDropdown.classList.add("hidden");
      };
    }

    // account button toggles dropdown
    if (accountBtn) {
      accountBtn.onclick = (e) => {
        e.stopPropagation();
        const isHidden = accountDropdown?.classList.contains("hidden");
        if (isHidden) {
          accountDropdown.classList.remove("hidden");
          accountBtn.setAttribute("aria-expanded", "true");
        } else {
          accountDropdown.classList.add("hidden");
          accountBtn.setAttribute("aria-expanded", "false");
        }
      };
    }
  } else {
    // show login link, hide account icon + dropdown
    if (authBtn) {
      authBtn.classList.remove("hidden");
      if (authBtnLabel) authBtnLabel.textContent = "Giriş / Qeydiyyat";
      authBtn.href = "/src/pages/auth/login.html";
    }
    if (accountWrap) {
      accountWrap.classList.add("hidden");
      accountDropdown && accountDropdown.classList.add("hidden");
    }
  }

  // admin button visibility (keep existing behavior)
  const adminBtn = document.getElementById("navAdminBtn");
  if (adminBtn) {
    if (isAdmin()) {
      adminBtn.classList.remove("hidden");
      adminBtn.style.display = "block";
    } else {
      adminBtn.classList.add("hidden");
      adminBtn.style.display = "none";
    }
  }
}

// --- Close dropdown on outside click: add this once during bindEvents (or app init) ---
document.addEventListener("click", (e) => {
  const acctDropdown = document.getElementById("accountDropdown");
  const acctBtn = document.getElementById("accountBtn");
  if (!acctDropdown || !acctBtn) return;
  const target = e.target;
  if (!acctDropdown.classList.contains("hidden")) {
    const isInside = acctDropdown.contains(target) || acctBtn.contains(target);
    if (!isInside) {
      acctDropdown.classList.add("hidden");
      acctBtn.setAttribute("aria-expanded", "false");
    }
  }
});

function isAdmin() {
  // backend case-sensitive check: "admin"
  return state.sessionUser?.role === "admin";
}

// Auth modal open/close
function openAuthModal() {
  // Redirect to login page instead of opening modal
  window.location.href = "/src/pages/auth/login.html";
}

function openResetPanel() {
  $("resetPanel")?.classList.remove("hidden");
}
function closeResetPanel() {
  $("resetPanel")?.classList.add("hidden");
}

// Real login
async function doLogin(email, password) {
  const data = await apiFetch("/api/auth/login", {
    method: "POST",
    body: { email, password },
    auth: false,
  });

  // login response: { token, user: { Id, Email, Role } }
  const token = data?.token;
  const u = data?.user;

  if (!token || !u) throw new Error("Login cavabı gözlənilən formatda deyil.");

  const normalized = {
    id: u.id ?? u.Id ?? null,
    email: u.email ?? u.Email ?? "",
    role: normalizeRole(u.role ?? u.Role ?? ""),
  };

  setAuth({ token, user: normalized });
  state.sessionUser = normalized;

  showToast({
    title: "Uğurlu giriş",
    message: `${normalized.email}`,
    type: "success",
  });

  updateAuthUI();
}

// Session check via /me
async function loadSessionFromToken() {
  const token = getToken();
  if (!token) {
    state.sessionUser = null;
    updateAuthUI();
    return;
  }

  try {
    const data = await apiFetch("/api/auth/me", { method: "GET", auth: true });
    // /me response: { user: { id, email, role } }
    const u = data?.user;
    if (!u) throw new Error("ME cavabı boşdur.");

    const normalized = {
      id: u.id ?? u.Id ?? null,
      email: u.email ?? u.Email ?? "",
      role: normalizeRole(u.role ?? u.Role ?? ""),
    };

    // keep token but refresh user
    setAuth({ token, user: normalized });
    state.sessionUser = normalized;
  } catch (e) {
    // token invalid / expired
    clearAuth();
    state.sessionUser = null;
    showToast({
      title: "Sessiya bitdi",
      message: "Yenidən giriş edin.",
      type: "warn",
    });
  } finally {
    updateAuthUI();
  }
}

function doLogout() {
  clearAuth();
  state.sessionUser = null;
  updateAuthUI();
  showView("shop");
  showToast({ title: "Çıxış", message: "Hesabdan çıxıldı.", type: "info" });
}

// Products (minimal)
async function loadProducts() {
  try {
    const data = await apiFetch("/api/products?pageSize=100", {
      method: "GET",
      auth: false,
    });
    // Backend returns { page, pageSize, total, totalPages, items }
    const items = Array.isArray(data)
      ? data
      : data?.items || data?.products || [];
    state.products = Array.isArray(items) ? items : [];
  } catch (e) {
    state.products = [];
    showToast({
      title: "Xəta",
      message: e.message || "Məhsullar yüklənmədi.",
      type: "danger",
    });
  }

  renderKPIs();
  renderProducts();
  initFiltersFromProducts();
}

// ── Kateqoriyaları backend-dən yükləyirik ──
// shophub-front/src/js/app.js
async function loadCategories() {
  try {
    const data = await apiFetch("/api/categories", { method: "GET", auth: false });
    const items = data?.items || [];
    state.categories = items;

    // populate left filter (categorySelect) with Names
    const leftSelect = $("categorySelect");
    if (leftSelect) {
      leftSelect.innerHTML =
        `<option value="">Bütün Kateqoriyalar</option>` +
        items.map(c => `<option value="${c.Name}">${c.Name}</option>`).join("");
    }

    // populate admin form dropdown (admProdCategory) WITH ID values
    const adminSelect = document.getElementById("admProdCategory");
    if (adminSelect) {
      adminSelect.innerHTML =
        `<option value="">Kateqoriya seçin...</option>` +
        items.map(cat => `<option value="${cat.Id}">${cat.Name}</option>`).join("");
    }

    // render admin categories table (you already have this)
    renderCategoriesTable();
  } catch (e) {
    console.error("loadCategories failed:", e);
  }
}

function renderCategoriesTable() {
  const tableBody = document.getElementById("adminCategoriesTable");
  if (!tableBody || !state.categories) return;

  tableBody.innerHTML = state.categories
    .map(
      (cat) => `
    <tr class="hover:bg-white/5 transition-colors" id="catRow-${cat.Id}">
      <td class="px-6 py-4 text-slate-500">${cat.Id}</td>
      <td class="px-6 py-4">
        <span id="catName-${cat.Id}" class="text-white font-medium">${cat.Name}</span>
        <input id="catEdit-${cat.Id}" type="text" value="${cat.Name}" 
          class="hidden bg-black/20 border border-blue-500 rounded-lg px-3 py-1 text-sm outline-none w-full">
      </td>
      <td class="px-6 py-4 flex gap-2">
        <button class="text-blue-400 hover:text-blue-300 font-medium text-sm" 
          onclick="startEditCategory(${cat.Id})">Redaktə</button>
        <button id="catSaveBtn-${cat.Id}" class="hidden text-green-400 hover:text-green-300 font-medium text-sm" 
          onclick="saveCategory(${cat.Id})">Yadda Saxla</button>
        <button id="catCancelBtn-${cat.Id}" class="hidden text-slate-400 hover:text-slate-300 font-medium text-sm" 
          onclick="cancelEditCategory(${cat.Id})">Ləğv</button>
        <button class="text-red-500 hover:text-red-400 font-bold text-sm" 
          onclick="deleteCategory(${cat.Id})">Sil</button>
      </td>
    </tr>
  `,
    )
    .join("");
}

function updateCategoryDropdown() {
  const select = $("categorySelect");
  if (!select) return;
  // prefer DB categories if we have them:
  if (Array.isArray(state.categories) && state.categories.length) {
    select.innerHTML = `<option value="">Bütün Kateqoriyalar</option>` +
      state.categories.map(c => `<option value="${c.Name}">${c.Name}</option>`).join("");
    return;
  }
  // fallback from products
  const categories = ["Bütün Kateqoriyalar", ...new Set(state.products.map(productCategory).filter(Boolean))];
  select.innerHTML = categories.map(cat => `<option value="${cat === 'Bütün Kateqoriyalar' ? '' : cat}">${cat}</option>`).join("");
}

// loadProducts funksiyasının sonuna updateCategoryDropdown(); sətrini əlavə et

// KPIs
function renderKPIs() {
  const products = state.products;
  const categories = new Set(products.map((p) => p.category).filter(Boolean));

  $("kpiProducts") && ($("kpiProducts").textContent = String(products.length));
  $("kpiCategories") &&
    ($("kpiCategories").textContent = String(categories.size));
  $("kpiOrders") && ($("kpiOrders").textContent = String(state.adminOrders.length));
  $("kpiUsers") && ($("kpiUsers").textContent = String(state.adminUsers.length));
}

function renderAdminTable() {
  const tableBody = $("adminProductsTable");
  if (!tableBody) return;

  tableBody.innerHTML = state.products
    .map(
      (p) => `
        <tr class="hover:bg-white/5 transition-colors">
            <td class="px-6 py-4 font-medium text-white">${productName(p)}</td>
            <td class="px-6 py-4">${formatMoneyAZN(productPrice(p))}</td>
            <td class="px-6 py-4">
                <span class="chip ${productStock(p) > 0 ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}">
                    ${productStock(p)} ədəd
                </span>
            </td>
            <td class="px-6 py-4 space-x-3">
                <button class="text-blue-400 hover:text-blue-300 font-bold" onclick="openEditProduct(${getProductId(p)})">Redaktə</button>
                <button class="text-red-500 hover:text-red-400 font-bold" onclick="deleteProduct(${getProductId(p)})">Sil</button>
            </td>
        </tr>
    `,
    )
    .join("");
}

function renderAdminOrdersTable() {
  const tableBody = $("adminOrdersTable");
  if (!tableBody) return;

  if (!state.adminOrders.length) {
    tableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-4 text-slate-400">Sifariş tapılmadı.</td></tr>`;
    return;
  }

  tableBody.innerHTML = state.adminOrders
    .map((order) => `
      <tr class="hover:bg-white/5 transition-colors">
        <td class="px-6 py-4">#${order.Id}</td>
        <td class="px-6 py-4">${order.UserEmail || "-"}</td>
        <td class="px-6 py-4">${order.Status}</td>
        <td class="px-6 py-4">${formatMoneyAZN(order.Total)}</td>
        <td class="px-6 py-4">
          <select data-order-status-id="${order.Id}" class="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-xs">
            ${ORDER_STATUSES.map((status) => `<option value="${status}" ${status === order.Status ? "selected" : ""}>${status}</option>`).join("")}
          </select>
        </td>
      </tr>
    `)
    .join("");

  tableBody.querySelectorAll("[data-order-status-id]").forEach((select) => {
    select.addEventListener("change", async () => {
      const id = Number(select.getAttribute("data-order-status-id"));
      try {
        await apiFetch(`/api/orders/${id}/status`, {
          method: "PATCH",
          body: { status: select.value },
        });
        await loadAdminData();
      } catch (error) {
        showToast({ title: "Xəta", message: error.message || "Status yenilənmədi.", type: "danger" });
      }
    });
  });
}

function renderAdminUsersTable() {
  const tableBody = $("adminUsersTable");
  if (!tableBody) return;

  if (!state.adminUsers.length) {
    tableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-4 text-slate-400">İstifadəçi tapılmadı.</td></tr>`;
    return;
  }

  tableBody.innerHTML = state.adminUsers
    .map((user) => `
      <tr class="hover:bg-white/5 transition-colors">
        <td class="px-6 py-4">#${user.Id}</td>
        <td class="px-6 py-4">${user.Email}</td>
        <td class="px-6 py-4">${user.Role}</td>
        <td class="px-6 py-4">${user.IsActive ? "Aktiv" : "Deaktiv"}</td>
        <td class="px-6 py-4 space-x-3">
          <button class="text-blue-400 hover:text-blue-300" data-user-role-id="${user.Id}" data-role="${user.Role === "admin" ? "user" : "admin"}">${user.Role === "admin" ? "user et" : "admin et"}</button>
          <button class="text-amber-400 hover:text-amber-300" data-user-active-id="${user.Id}" data-active="${user.IsActive ? "false" : "true"}">${user.IsActive ? "deaktiv et" : "aktiv et"}</button>
        </td>
      </tr>
    `)
    .join("");

  tableBody.querySelectorAll("[data-user-role-id]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = Number(btn.getAttribute("data-user-role-id"));
      const role = btn.getAttribute("data-role");
      try {
        await apiFetch(`/api/users/${id}/role`, { method: "PATCH", body: { role } });
        await loadAdminData();
      } catch (error) {
        showToast({ title: "Xəta", message: error.message || "Rol yenilənmədi.", type: "danger" });
      }
    });
  });

  tableBody.querySelectorAll("[data-user-active-id]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = Number(btn.getAttribute("data-user-active-id"));
      const isActive = btn.getAttribute("data-active") === "true";
      try {
        await apiFetch(`/api/users/${id}/active`, { method: "PATCH", body: { isActive } });
        await loadAdminData();
      } catch (error) {
        showToast({ title: "Xəta", message: error.message || "Status yenilənmədi.", type: "danger" });
      }
    });
  });
}

async function loadAdminData() {
  if (!isAdmin()) return;
  try {
    const [ordersPayload, usersPayload] = await Promise.all([
      apiFetch("/api/orders", { method: "GET", auth: true }),
      apiFetch("/api/users", { method: "GET", auth: true }),
    ]);

    state.adminOrders = Array.isArray(ordersPayload?.items) ? ordersPayload.items : [];
    state.adminUsers = Array.isArray(usersPayload?.items) ? usersPayload.items : [];

    renderAdminOrdersTable();
    renderAdminUsersTable();
    renderKPIs();
  } catch (error) {
    showToast({ title: "Xəta", message: error.message || "Admin məlumatları alınmadı.", type: "danger" });
  }
}

// Products UI + filters (simple)
function getProductId(p) {
  return p.id ?? p.Id ?? p.productId ?? p.ProductId;
}

function productName(p) {
  return p.name ?? p.title ?? p.Name ?? "Məhsul";
}

function productPrice(p) {
  return Number(p.price ?? p.Price ?? 0);
}

function productStock(p) {
  return Number(p.stock ?? p.Stock ?? 0);
}

function productCategory(p) {
  return p.category ?? p.Category ?? p.CategoryName ?? "Digər";
}

function productBrand(p) {
  return p.brand ?? p.Brand ?? "—";
}

function productColor(p) {
  return p.color ?? p.Color ?? "—";
}

function productRating(p) {
  return Number(p.rating ?? p.Rating ?? 0);
}

// Gücləndirilmiş productImages funksiyası (p yoxlaması + optional chaining)
function productImages(p) {
  // If product is falsy, return placeholder immediately
  if (!p) return ["https://via.placeholder.com/400x300?text=No+Image"];

  // 1. Direct string field (from admin form or simple backends)
  const imgStr = p?.image ?? p?.Image ?? p?.imageUrl ?? p?.ImageUrl ?? p?.Url ?? p?.url;
  if (imgStr && typeof imgStr === "string" && imgStr.trim() !== "") {
    return [imgStr];
  }

  // 2. Array field: p.images or p.Images
  const imgs = p?.images ?? p?.Images ?? [];
  if (Array.isArray(imgs) && imgs.length > 0) {
    return imgs
      .map((item) => {
        if (typeof item === "string") return item;
        // Handle {url: "..."} or {Url: "..."} or {Url, Id, SortOrder}
        return item?.url ?? item?.Url ?? item?.UrlString ?? "";
      })
      .filter(Boolean);
  }

  // 3. Fallback — no image available
  return ["https://via.placeholder.com/400x300?text=No+Image"];
}

/// More robust filters init — only require categorySelect
function initFiltersFromProducts() {
  const categorySelect = $("categorySelect");
  const brandSelect = $("brandSelect"); // may not exist
  const colorSelect = $("colorSelect"); // may not exist

  // If no category select, nothing to do
  if (!categorySelect) return;

  // Build sets using product helpers
  const categoriesFromProducts = [...new Set(state.products.map(productCategory).filter(Boolean))];
  const brands = [...new Set(state.products.map(productBrand).filter(Boolean))];
  const colors = [...new Set(state.products.map(productColor).filter(Boolean))];

  // If loadCategories() populated categorySelect from DB, don't overwrite it.
  if (!categorySelect.options.length || categorySelect.options.length === 1) {
    // only populate from products if no DB categories present
    const categories = ["Hamısı", ...categoriesFromProducts];
    categorySelect.innerHTML = categories.map(x => `<option value="${x}">${x}</option>`).join("");
  }

  if (brandSelect) brandSelect.innerHTML = ["Hamısı", ...brands].map(x => `<option value="${x}">${x}</option>`).join("");
  if (colorSelect) colorSelect.innerHTML = ["Hamısı", ...colors].map(x => `<option value="${x}">${x}</option>`).join("");
}
function filteredProducts() {
  const q = ($("searchInput")?.value || "").trim().toLowerCase();
  const minP = Number($("minPrice")?.value || 0);
  const maxP = Number($("maxPrice")?.value || 999999999);
  const cat = $("categorySelect")?.value || "Hamısı";
  const br = $("brandSelect")?.value || "Hamısı";
  const col = $("colorSelect")?.value || "Hamısı";
  const inStock = $("inStockOnly")?.checked || false;

  let list = [...state.products];

  if (q) {
    list = list.filter((p) => {
      const s =
        `${productName(p)} ${productBrand(p)} ${productCategory(p)}`.toLowerCase();
      return s.includes(q);
    });
  }
  list = list.filter((p) => productPrice(p) >= minP && productPrice(p) <= maxP);

  if (cat !== "Hamısı") list = list.filter((p) => productCategory(p) === cat);
  if (br !== "Hamısı") list = list.filter((p) => productBrand(p) === br);
  if (col !== "Hamısı") list = list.filter((p) => productColor(p) === col);
  if (inStock) list = list.filter((p) => productStock(p) > 0);

  // sort
  const sort = $("sortSelect")?.value || "featured";
  if (sort === "price_asc")
    list.sort((a, b) => productPrice(a) - productPrice(b));
  if (sort === "price_desc")
    list.sort((a, b) => productPrice(b) - productPrice(a));
  if (sort === "rating_desc")
    list.sort((a, b) => productRating(b) - productRating(a));
  if (sort === "newest")
    list.sort((a, b) => (getProductId(b) || 0) - (getProductId(a) || 0));

  return list;
}

function renderProducts() {
  const grid = $("productsGrid");
  const empty = $("emptyState");
  const resultCount = $("resultCount");
  if (!grid) return;

  const list = filteredProducts();
  if (resultCount) resultCount.textContent = `${list.length} nəticə`;

  if (!list.length) {
    empty && empty.classList.remove("hidden");
    grid.innerHTML = "";
    return;
  }
  empty && empty.classList.add("hidden");

  grid.innerHTML = list
    .map((p) => {
      const id = getProductId(p);
      const img = productImages(p)[0];
      const stock = productStock(p);
      const stockLabel = stock > 0 ? `Stok: ${stock}` : `Stok yoxdur`;
      return `
      <article class="glass p-4 hover:brightness-[1.03] transition">
        <div class="aspect-[4/3] rounded-2xl overflow-hidden border border-white/10 bg-black/20">
          <img src="${img}" alt="${productName(p)}" class="product-img w-full h-full object-cover"/>
        </div>
        <div class="mt-3">
          <div class="text-sm font-semibold line-clamp-2">${productName(p)}</div>
          <div class="text-xs muted2 mt-1">${productBrand(p)} • ${productCategory(p)} • ${productColor(p)}</div>
          <div class="flex items-center justify-between mt-3">
            <div class="text-lg font-semibold">${formatMoneyAZN(productPrice(p))}</div>
            <span class="chip text-xs">${stockLabel}</span>
          </div>
          <div class="mt-3 flex gap-2">
            <button class="btn btn-primary flex-1 text-sm" data-open-product="${id}">Detallar</button>
            <button class="btn flex-1 text-sm" data-add-cart="${id}" ${stock <= 0 ? "disabled" : ""}>
              Səbətə
            </button>
          </div>
        </div>
      </article>
    `;
    })
    .join("");

  // bind buttons
  grid.querySelectorAll("[data-open-product]").forEach((btn) => {
    btn.addEventListener("click", () =>
      openProductModal(btn.getAttribute("data-open-product")),
    );
  });
  grid.querySelectorAll("[data-add-cart]").forEach((btn) => {
    btn.addEventListener("click", () =>
      addToCart(btn.getAttribute("data-add-cart")),
    );
  });
}

// Cart (minimal, UI works)
function loadCart() {
  const raw = safeJsonParse(localStorage.getItem("shophub_cart_v1"), []);
  state.cart = Array.isArray(raw) ? raw : [];
  renderCartBadge();
  renderCartDrawer();
}

function saveCart() {
  localStorage.setItem("shophub_cart_v1", JSON.stringify(state.cart));
  renderCartBadge();
  renderCartDrawer();
}

function renderCartBadge() {
  const count = state.cart.reduce((s, x) => s + Number(x.qty || 0), 0);

  const b1 = $("cartBadge");
  const b2 = $("cartBadgeSm");
  if (b1) {
    b1.textContent = String(count);
    b1.classList.toggle("hidden", count === 0);
  }
  if (b2) {
    b2.textContent = String(count);
    b2.classList.toggle("hidden", count === 0);
  }

  $("cartSub") && ($("cartSub").textContent = count ? `${count} məhsul` : "—");
}

function addToCart(productId) {
  const id = Number(productId);
  const p = state.products.find((x) => Number(getProductId(x)) === id);
  if (!p) return;

  if (productStock(p) <= 0) {
    showToast({
      title: "Stok yoxdur",
      message: "Bu məhsul stokda deyil.",
      type: "warn",
    });
    return;
  }

  const existing = state.cart.find((x) => Number(x.productId) === id);
  if (existing) existing.qty += 1;
  else state.cart.push({ productId: id, qty: 1, productSnapshot: p });

  saveCart();
  showToast({
    title: "Səbət",
    message: "Məhsul səbətə əlavə olundu.",
    type: "success",
  });
}

function clearCart() {
  state.cart = [];
  saveCart();
}

function cartTotals() {
  const subtotal = state.cart.reduce((s, x) => {
    const p =
      x.productSnapshot ||
      state.products.find(
        (pp) => Number(getProductId(pp)) === Number(x.productId),
      );
    return s + productPrice(p) * Number(x.qty || 0);
  }, 0);
  const shipping = 0;
  return { subtotal, shipping, total: subtotal + shipping };
}

function openCart() {
  $("cartDrawer")?.classList.add("show");
  $("drawerBackdrop")?.classList.add("show");
}
function closeCart() {
  $("cartDrawer")?.classList.remove("show");
  $("drawerBackdrop")?.classList.remove("show");
}

function renderCartDrawer() {
  const itemsWrap = $("cartItems");
  const empty = $("cartEmpty");
  if (!itemsWrap) return;

  if (!state.cart.length) {
    empty && empty.classList.remove("hidden");
    itemsWrap.innerHTML = "";
  } else {
    empty && empty.classList.add("hidden");
    itemsWrap.innerHTML = state.cart
      .map((x) => {
        const p =
          x.productSnapshot ||
          state.products.find(
            (pp) => Number(getProductId(pp)) === Number(x.productId),
          );
        const img = productImages(p)[0];
        return `
        <div class="glass p-3 flex gap-3">
          <div class="h-16 w-16 rounded-2xl overflow-hidden border border-white/10 bg-black/20 shrink-0">
            <img src="${img}" class="w-full h-full object-cover" alt="">
          </div>
          <div class="min-w-0 flex-1">
            <div class="text-sm font-semibold truncate">${productName(p)}</div>
            <div class="text-xs muted2 mt-0.5">${formatMoneyAZN(productPrice(p))} • ${productBrand(p)}</div>
            <div class="mt-2 flex items-center gap-2">
              <button class="btn text-sm" data-dec="${x.productId}">−</button>
              <span class="chip text-sm">${x.qty}</span>
              <button class="btn text-sm" data-inc="${x.productId}">+</button>
              <button class="btn btn-danger text-sm ml-auto" data-remove="${x.productId}">Sil</button>
            </div>
          </div>
        </div>
      `;
      })
      .join("");
  }

  const { subtotal, shipping, total } = cartTotals();
  $("cartSubtotal") &&
    ($("cartSubtotal").textContent = formatMoneyAZN(subtotal));
  $("cartShipping") &&
    ($("cartShipping").textContent = formatMoneyAZN(shipping));
  $("cartTotal") && ($("cartTotal").textContent = formatMoneyAZN(total));

  // bind controls
  itemsWrap.querySelectorAll("[data-inc]").forEach(
    (b) =>
      (b.onclick = () => {
        const id = Number(b.getAttribute("data-inc"));
        const it = state.cart.find((x) => Number(x.productId) === id);
        if (it) it.qty += 1;
        saveCart();
      }),
  );
  itemsWrap.querySelectorAll("[data-dec]").forEach(
    (b) =>
      (b.onclick = () => {
        const id = Number(b.getAttribute("data-dec"));
        const it = state.cart.find((x) => Number(x.productId) === id);
        if (it) {
          it.qty -= 1;
          if (it.qty <= 0)
            state.cart = state.cart.filter((x) => Number(x.productId) !== id);
          saveCart();
        }
      }),
  );
  itemsWrap.querySelectorAll("[data-remove]").forEach(
    (b) =>
      (b.onclick = () => {
        const id = Number(b.getAttribute("data-remove"));
        state.cart = state.cart.filter((x) => Number(x.productId) !== id);
        saveCart();
      }),
  );
}

// Product modal (minimal)
function openProductModal(productId) {
  const id = Number(productId);
  const p = state.products.find((x) => Number(getProductId(x)) === id);
  if (!p) return;

  $("pmTitle") && ($("pmTitle").textContent = productName(p));
  $("pmMeta") &&
    ($("pmMeta").textContent = `${productBrand(p)} • ${productCategory(p)}`);
  $("pmPrice") && ($("pmPrice").textContent = formatMoneyAZN(productPrice(p)));
  $("pmStock") &&
    ($("pmStock").textContent =
      productStock(p) > 0 ? `Stok: ${productStock(p)}` : "Stok yoxdur");
  $("pmColor") && ($("pmColor").textContent = productColor(p));

  const imgs = productImages(p);
  $("pmImage") && ($("pmImage").src = imgs[0]);

  const thumbs = $("pmThumbs");
  if (thumbs) {
    thumbs.innerHTML = imgs
      .slice(0, 4)
      .map(
        (url) =>
          `<button class="btn p-0 overflow-hidden rounded-2xl border border-white/10 bg-black/20">
         <img src="${url}" class="w-full h-16 object-cover" />
       </button>`,
      )
      .join("");
    [...thumbs.querySelectorAll("button")].forEach((btn, idx) => {
      btn.onclick = () => {
        $("pmImage").src = imgs[idx];
      };
    });
  }

  const specs = $("pmSpecs");
  const pSpecs = p.specs ?? p.Specs ?? [];
  if (specs) {
    const arr = Array.isArray(pSpecs) ? pSpecs : String(pSpecs).split("\n");
    specs.innerHTML = arr
      .filter(Boolean)
      .map((s) => `<li>${s}</li>`)
      .join("");
  }

  $("pmRatingChip") &&
    ($("pmRatingChip").textContent = `${productRating(p).toFixed(1)}/5`);
  $("pmReviews") && ($("pmReviews").textContent = "Rəylər backend-də hələ yoxdur.");
  
  // add button
  const addBtn = $("pmAddBtn");
  if (addBtn) addBtn.onclick = () => addToCart(id);

  $("productBackdrop")?.classList.add("show");
}

function closeProductModal() {
  $("productBackdrop")?.classList.remove("show");
}

// Admin gate
// Admin gate — updated
function goAdmin() {
  if (!state.sessionUser) {
    showToast({
      title: "Giriş lazımdır",
      message: "Admin üçün əvvəlcə daxil olun.",
      type: "warn",
    });
    window.location.href = "/src/pages/auth/login.html"; // redirect instead of modal
    return;
  }
  if (!isAdmin()) {
    showToast({
      title: "İcazə yoxdur",
      message: "Bu hissə yalnız admin üçündür.",
      type: "danger",
    });
    return;
  }
  window.location.href = "/admin/dashboard";
}

// Bind UI events
function bindEvents() {

  $("themeToggle") &&
    ($("themeToggle").onclick = () => {
      const current = document.documentElement.getAttribute("data-theme") || "light";
      applyTheme(current === "dark" ? "light" : "dark");
    });

  // footer year
  $("year") && ($("year").textContent = String(new Date().getFullYear()));

  // navigation
  $("navShopBtn") && ($("navShopBtn").onclick = () => showView("shop"));
  $("navShopBtn2") && ($("navShopBtn2").onclick = () => showView("shop"));

  $("navAdminBtn") && ($("navAdminBtn").onclick = goAdmin);
  $("navAdminBtn2") && ($("navAdminBtn2").onclick = goAdmin);

  $("ctaBrowse") &&
    ($("ctaBrowse").onclick = () => {
      showView("shop");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  $("ctaAdmin") && ($("ctaAdmin").onclick = goAdmin);

  // mobile nav
  const mobBtn = $("mobileMenuBtn");
  const mobNav = $("mobileNav");
  if (mobBtn && mobNav) {
    mobBtn.onclick = () => mobNav.classList.toggle("hidden");
  }

  // auth buttons
  const openAuthBtns = ["authBtn", "authBtnSm", "authBtn2"]
    .map($)
    .filter(Boolean);
  openAuthBtns.forEach((b) => (b.onclick = openAuthModal));

  $("closeAuthModal") && ($("closeAuthModal").onclick = closeAuthModal);
  $("authBackdrop") &&
    ($("authBackdrop").onclick = (e) => {
      if (e.target?.id === "authBackdrop") closeAuthModal();
    });

  // login

  // Auth — redirect to login page (modal was removed)
  // authBtn is now an <a> link, so no onclick needed for opening modal.
  // But if user is logged in, clicking should log out instead:
  const authBtn = $("authBtn");
  if (authBtn) {
    authBtn.onclick = (e) => {
      if (state.sessionUser) {
        e.preventDefault();
        doLogout();
      }
      // If not logged in, the <a href="./src/pages/login.html"> navigates naturally
    };
  }

  // logout
  ["logoutBtn", "logoutBtn2"]
    .map($)
    .filter(Boolean)
    .forEach((b) => (b.onclick = doLogout));
  //   $("loginBtn") &&
  //     ($("loginBtn").onclick = async () => {
  //       const email = ($("loginEmail")?.value || "").trim();
  //       const pass = $("loginPass")?.value || "";
  //       if (!email || !pass) {
  //         showToast({
  //           title: "Xəta",
  //           message: "Email və şifrə daxil edin.",
  //           type: "warn",
  //         });
  //         return;
  //       }
  //       try {
  //         await doLogin(email, pass);
  //         closeAuthModal();
  //       } catch (e) {
  //         showToast({
  //           title: "Login alınmadı",
  //           message: e.message || "Xəta",
  //           type: "danger",
  //         });
  //       }
  //     });
  //   // register (if backend has endpoint; otherwise shows info)
  //   // Register (Real integration)
  // $("registerBtn") && ($("registerBtn").onclick = async () => {
  //   const email = ($("regEmail")?.value || "").trim();
  //   const pass = $("regPass")?.value || "";

  //   if (!email || !pass) {
  //     showToast({ title: "Xəta", message: "Email və şifrə daxil edin.", type: "warn" });
  //     return;
  //   }

  //   try {
  //     // Backend-ə qeydiyyat sorğusu göndəririk
  //     await apiFetch("/api/auth/register", {
  //       method: "POST",
  //       body: { email, password: pass },
  //       auth: false
  //     });

  //     showToast({
  //       title: "Qeydiyyat uğurludur",
  //       message: "Hesabınız yaradıldı. İndi giriş edə bilərsiniz.",
  //       type: "success"
  //     });

  //     // İstifadəçini avtomatik login panelinə yönləndirmək olar
  //     // Və ya birbaşa login etmək:
  //     await doLogin(email, pass);
  //     closeAuthModal();

  //   } catch (e) {
  //     showToast({
  //       title: "Qeydiyyat xətası",
  //       message: e.message || "Bu email artıq istifadə olunur.",
  //       type: "danger"
  //     });
  //   }
  // });

  //   // logout
  //   ["logoutBtn", "logoutBtn2"]
  //     .map($)
  //     .filter(Boolean)
  //     .forEach((b) => (b.onclick = doLogout));

  //   // reset password (legacy example)
  //   //   $("openResetBtn") && ($("openResetBtn").onclick = openResetPanel);
  //   $("closeResetBtn") && ($("closeResetBtn").onclick = closeResetPanel);
  // $("resetPassBtn") &&
  //   ($("resetPassBtn").onclick = () => {
  //     showToast({
  //       title: "Demo",
  //       message: "Şifrə sıfırlama backend-də ayrıca yazılmalıdır.",
  //       type: "info",
  //     });
  //   });

  // filters
  [
    "searchInput",
    "minPrice",
    "maxPrice",
    "categorySelect",
    "brandSelect",
    "colorSelect",
    "inStockOnly",
    "sortSelect",
  ]
    .map($)
    .filter(Boolean)
    .forEach((el) => el.addEventListener("input", renderProducts));

  $("resetFiltersBtn") &&
    ($("resetFiltersBtn").onclick = () => {
      $("searchInput") && ($("searchInput").value = "");
      $("minPrice") && ($("minPrice").value = "");
      $("maxPrice") && ($("maxPrice").value = "");
      $("categorySelect") && ($("categorySelect").value = "Hamısı");
      $("brandSelect") && ($("brandSelect").value = "Hamısı");
      $("colorSelect") && ($("colorSelect").value = "Hamısı");
      $("inStockOnly") && ($("inStockOnly").checked = false);
      $("sortSelect") && ($("sortSelect").value = "featured");
      renderProducts();
    });
  $("quickCheckoutBtn") && ($("quickCheckoutBtn").onclick = openCart);
  ["cartBtn", "cartBtnSm"]
    .map($)
    .filter(Boolean)
    .forEach((b) => (b.onclick = openCart));
  $("closeCartBtn") && ($("closeCartBtn").onclick = closeCart);
  $("drawerBackdrop") && ($("drawerBackdrop").onclick = closeCart);
  $("startShoppingBtn") &&
    ($("startShoppingBtn").onclick = () => {
      closeCart();
      showView("shop");
    });
  $("clearCartBtn") &&
    ($("clearCartBtn").onclick = () => {
      clearCart();
      showToast({ title: "Səbət", message: "Səbət təmizləndi.", type: "info" });
    });
  
    
  async function processCheckout() {
    if (state.cart.length === 0) {
      showToast({
        title: "Səbət boşdur",
        message: "Sifariş üçün məhsul əlavə edin.",
        type: "warn",
      });
      return;
    }

    // require login
    if (!state.sessionUser) {
      window.location.href = "/src/pages/auth/login.html";
      return;
    }

    try {
      // Build items exactly as backend expects
      const items = state.cart.map((item) => ({
        productId: Number(item.productId),
        qty: Number(item.qty),
      }));

      // basic validation client-side
      if (!Array.isArray(items) || items.length === 0) {
        showToast({
          title: "Xəta",
          message: "Səbət formatı yalnışdır.",
          type: "danger",
        });
        return;
      }

      const orderData = {
        items,
        shippingFee: 0, // or compute if you have shipping logic
      };

      // Call the correct checkout endpoint
      await apiFetch("/api/orders/checkout", {
        method: "POST",
        body: orderData,
        auth: true,
      });

      clearCart();
      closeCart();
      showToast({
        title: "Sifariş uğurludur!",
        message: "Sifarişiniz qəbul edildi.",
        type: "success",
      });
    } catch (error) {
      // Show actual server message when possible
      showToast({
        title: "Sifariş alınmadı",
        message: error && error.message ? error.message : "Xəta baş verdi.",
        type: "danger",
      });
      console.error("checkout error:", error);
    }
  }

  $("checkoutBtn") && ($("checkoutBtn").onclick = () => {
    if (!state.cart.length) {
      showToast({ title: "Səbət boşdur", message: "Sifariş üçün məhsul əlavə edin.", type: "warn" });
      return;
    }
    window.location.href = "/src/pages/checkout.html";
  });
  $("closeProductModal") &&
    ($("closeProductModal").onclick = closeProductModal);
  $("productBackdrop") &&
    ($("productBackdrop").onclick = (e) => {
      if (e.target?.id === "productBackdrop") closeProductModal();
    });
}

// Boot
async function init() {
  initTheme();
  bindEvents();
  loadCart();
  await loadSessionFromToken(); // token varsa sessiyanı real yoxlayır
  await loadProducts(); // məhsulları çəkir
  await loadCategories(); // Kateqoriyaları çəkir
  initFiltersFromProducts(); // re-run to ensure UI uses loaded categories if needed

  showView("shop");
}
init().catch((e) => {
  console.error(e);
  showToast({
    title: "Xəta",
    message: e.message || "Naməlum xəta",
    type: "danger",
  });
});

// təkmilləşdirilmiş uploadToCloudinary (debug ilə)
async function uploadToCloudinary(file) {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "shophub_preset";

  console.log("Cloudinary upload attempt", { cloudName, uploadPreset, fileName: file?.name });

  if (!cloudName) throw new Error("Cloudinary cloud name təyin edilməyib.");

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    console.error("Cloudinary response error:", res.status, data);
    // Burada daha informativ error ver
    throw new Error(data?.error?.message || `Cloudinary upload failed (${res.status})`);
  }
  return data.secure_url;
}

// --- submit handler (ən azı biri: URL və ya fayl) ---
const addProductForm = document.getElementById("addProductForm");

if (addProductForm) {
  addProductForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("admProdName").value.trim();
    const price = document.getElementById("admProdPrice").value;
    const stock = document.getElementById("admProdStock").value;
    const category = document.getElementById("admProdCategory").value;
    const imageUrlValue = document.getElementById("admProdImage").value.trim();

    // Validasiya: əsas sahələr
    if (!name || !price || !stock || !category) {
      showToast({ title: "Xəta", message: "Ad, qiymət, stok və kateqoriya mütləqdir.", type: "danger" });
      return;
    }

    // Yeni: şəkil URL'i məcburi etmək istəyirsinizsə bu yoxlamanı saxlayın,
    // əks halda burada boş buraxa bilərsiniz.
    if (!imageUrlValue) {
      showToast({ title: "Xəta", message: "Şəkil URL daxil edin.", type: "danger" });
      return;
    }

    // Sadə URL yoxlaması (lazım olsa daha sərt regex istifadə edin)
    if (!/^https?:\/\/.+/.test(imageUrlValue)) {
      showToast({ title: "Xəta", message: "Etibarlı şəkil URL daxil edin.", type: "danger" });
      return;
    }

    try {
      const catId = parseInt(category, 10);
      await apiFetch("/api/products", {
        method: "POST",
        body: {
          name,
          price: parseFloat(price),
          stock: parseInt(stock, 10),
          categoryId: Number.isFinite(catId) && catId > 0 ? catId : null,
          images: imageUrlValue ? [imageUrlValue] : [],
        },
      });

      showToast({
        title: "Uğurlu!",
        message: "Məhsul bazaya əlavə edildi.",
        type: "success",
      });

      addProductForm.reset();
      await loadProducts();
      renderAdminTable();
    } catch (error) {
      console.error("Xəta:", error);
      showToast({ title: "Xəta", message: error.message || "Məhsul əlavə olunmadı.", type: "danger" });
    }
  });
}

// ═══ KATEQORİYA CRUD ƏMƏLİYYATLARI ═══

// Yeni kateqoriya yaratmaq
const addCategoryForm = document.getElementById("addCategoryForm");
if (addCategoryForm) {
  addCategoryForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nameInput = document.getElementById("admCatName");
    const name = nameInput?.value?.trim();

    if (!name) {
      showToast({
        title: "Xəta",
        message: "Kateqoriya adını daxil edin.",
        type: "danger",
      });
      return;
    }

    try {
      await apiFetch("/api/categories", {
        method: "POST",
        body: { name },
      });

      showToast({
        title: "Uğurlu!",
        message: `"${name}" kateqoriyası yaradıldı.`,
        type: "success",
      });
      nameInput.value = ""; // Input-u təmizləyirik
      await loadCategories(); // Cədvəli və dropdown-u yeniləyirik
    } catch (error) {
      showToast({
        title: "Xəta",
        message: error.message || "Kateqoriya yaradıla bilmədi.",
        type: "danger",
      });
    }
  });
}

// Redaktə rejimini açmaq
function startEditCategory(id) {
  document.getElementById(`catName-${id}`)?.classList.add("hidden");
  document.getElementById(`catEdit-${id}`)?.classList.remove("hidden");
  document.getElementById(`catSaveBtn-${id}`)?.classList.remove("hidden");
  document.getElementById(`catCancelBtn-${id}`)?.classList.remove("hidden");
  document.getElementById(`catEdit-${id}`)?.focus();
}

// Redaktəni ləğv etmək
function cancelEditCategory(id) {
  const cat = state.categories.find((c) => c.Id === id);
  document.getElementById(`catEdit-${id}`).value = cat?.Name || "";
  document.getElementById(`catName-${id}`)?.classList.remove("hidden");
  document.getElementById(`catEdit-${id}`)?.classList.add("hidden");
  document.getElementById(`catSaveBtn-${id}`)?.classList.add("hidden");
  document.getElementById(`catCancelBtn-${id}`)?.classList.add("hidden");
}

// Kateqoriyanı yeniləmək (PUT)
async function saveCategory(id) {
  const input = document.getElementById(`catEdit-${id}`);
  const newName = input?.value?.trim();

  if (!newName) {
    showToast({ title: "Xəta", message: "Ad boş ola bilməz.", type: "danger" });
    return;
  }

  try {
    await apiFetch(`/api/categories/${id}`, {
      method: "PUT",
      body: { name: newName },
    });

    showToast({
      title: "Yeniləndi!",
      message: `Kateqoriya "${newName}" olaraq dəyişdirildi.`,
      type: "success",
    });
    await loadCategories(); // Hər şeyi yeniləyirik
  } catch (error) {
    showToast({
      title: "Xəta",
      message: error.message || "Yeniləmə alınmadı.",
      type: "danger",
    });
  }
}

// Kateqoriyanı silmək (DELETE)
async function deleteCategory(id) {
  const cat = state.categories.find((c) => c.Id === id);
  const catName = cat?.Name || `ID: ${id}`;

  // Təsdiq dialoqundan istifadə edirik
  const backdrop = document.getElementById("confirmBackdrop");
  const okBtn = document.getElementById("confirmOk");
  const cancelBtn = document.getElementById("confirmCancel");

  // Dialog mətnini dəyişirik
  backdrop.querySelector("h3").textContent = "Kateqoriya Silinsin?";
  backdrop.querySelector("p").textContent =
    `"${catName}" kateqoriyası silinəcək. Davam etmək istəyirsiniz?`;
  backdrop.classList.add("show");

  const confirmed = await new Promise((resolve) => {
    okBtn.onclick = () => {
      backdrop.classList.remove("show");
      resolve(true);
    };
    cancelBtn.onclick = () => {
      backdrop.classList.remove("show");
      resolve(false);
    };
    backdrop.onclick = (e) => {
      if (e.target === backdrop) {
        backdrop.classList.remove("show");
        resolve(false);
      }
    };
  });

  if (!confirmed) {
    // Mətni geri qaytarırıq
    backdrop.querySelector("h3").textContent = "Məhsul Silinsin?";
    backdrop.querySelector("p").textContent =
      "Bu əməliyyat geri qaytarıla bilməz. Davam etmək istəyirsiniz?";
    return;
  }

  // Mətni geri qaytarırıq
  backdrop.querySelector("h3").textContent = "Məhsul Silinsin?";
  backdrop.querySelector("p").textContent =
    "Bu əməliyyat geri qaytarıla bilməz. Davam etmək istəyirsiniz?";

  try {
    await apiFetch(`/api/categories/${id}`, { method: "DELETE" });

    showToast({
      title: "Silindi!",
      message: `"${catName}" kateqoriyası silindi.`,
      type: "success",
    });
    await loadCategories();
  } catch (error) {
    showToast({
      title: "Xəta",
      message: error.message || "Bu kateqoriyada məhsul var, silinə bilməz.",
      type: "danger",
    });
  }
}

// Funksiyaları global edirik (HTML onclick üçün)
window.startEditCategory = startEditCategory;
window.cancelEditCategory = cancelEditCategory;
window.saveCategory = saveCategory;
window.deleteCategory = deleteCategory;

function closeEditProductModal() {
  $("editProductBackdrop")?.classList.remove("show");
}

function openEditProduct(id) {
  const product = state.products.find((p) => Number(getProductId(p)) === Number(id));
  if (!product) return;

  $("editProdId").value = getProductId(product);
  $("editProdName").value = productName(product);
  $("editProdPrice").value = productPrice(product);
  $("editProdStock").value = productStock(product);
  $("editProductBackdrop")?.classList.add("show");
}

const editProductForm = document.getElementById("editProductForm");
if (editProductForm) {
  editProductForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = Number($("editProdId")?.value);
    const name = $("editProdName")?.value?.trim();
    const price = Number($("editProdPrice")?.value);
    const stock = Number($("editProdStock")?.value);

    if (!id || !name) {
      showToast({ title: "Xəta", message: "Məhsul məlumatı natamamdır.", type: "danger" });
      return;
    }

    try {
      await apiFetch(`/api/products/${id}`, {
        method: "PUT",
        body: { name, price, stock },
      });

      closeEditProductModal();
      await loadProducts();
      renderAdminTable();
      showToast({ title: "Uğurlu", message: "Məhsul yeniləndi.", type: "success" });
    } catch (error) {
      showToast({ title: "Xəta", message: error.message || "Məhsul yenilənmədi.", type: "danger" });
    }
  });
}

$("editProductCancel") && ($("editProductCancel").onclick = closeEditProductModal);
$("editProductBackdrop") &&
  ($("editProductBackdrop").onclick = (e) => {
    if (e.target?.id === "editProductBackdrop") closeEditProductModal();
  });


async function deleteProduct(id) {
  const backdrop = document.getElementById("confirmBackdrop");
  const okBtn = document.getElementById("confirmOk");
  const cancelBtn = document.getElementById("confirmCancel");

  backdrop.classList.add("show");
  // Düymələrə kliklənməni gözləyən yeni bir Promise yaradırıq
  const userConfirmed = await new Promise((resolve) => {
    okBtn.onclick = () => {
      backdrop.classList.remove("show");
      resolve(true);
    };
    cancelBtn.onclick = () => {
      backdrop.classList.remove("show");
      resolve(false);
    };
    // Arxa fona klikləyəndə də bağlansın
    backdrop.onclick = (e) => {
      if (e.target === backdrop) {
        backdrop.classList.remove("show");
        resolve(false);
      }
    };
  });

  if (!userConfirmed) return;
  // SİLME PROSESİ BAŞLAYIR
  try {
    await apiFetch(`/api/products/${id}`, { method: "DELETE" });

    showToast({
      title: "Uğurla Silindi",
      message: "Məhsul artıq siyahıda yoxdur.",
      type: "success",
    });

    await loadProducts();
    renderAdminTable();
  } catch (e) {
    showToast({
      title: "Xəta!",
      message: "Silinmə baş tutmadı.",
      type: "danger",
    });
  }
}

// VACİB: HTML-dən (onclick) çağıra bilmək üçün funksiyanı qlobal edirik
window.openEditProduct = openEditProduct;
window.deleteProduct = deleteProduct;