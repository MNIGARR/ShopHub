// src/js/app.js
// ShopHub Frontend (real auth integration)
// Backend endpoints assumed:
// POST   /api/auth/login  -> { token, user: { Id, Email, Role } }
// GET    /api/auth/me     -> { user: { id, email, role } }
// Products (optional for now):
// GET    /api/products
// GET    /api/products/:id
const API_BASE = "http://localhost:5000"; // <-- backend portunu burda düzəlt
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

// Toast
let toastTimer = null;
function showToast({ title = "Bildiriş", message = "", type = "info" } = {}) {
  const wrap = $("toastWrap");
  const toast = $("toast");
  const tTitle = $("toastTitle");
  const tMsg = $("toastMsg");
  const icon = $("toastIcon");
  const close = $("toastClose");

  if (!toast || !tTitle || !tMsg || !icon || !close) return;

  tTitle.textContent = title;
  tMsg.textContent = message;

  const icons = {
    info: "ℹ️",
    success: "✅",
    warn: "⚠️",
    danger: "⛔",
  };
  icon.textContent = icons[type] || "ℹ️";

  toast.classList.remove("hidden");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add("hidden"), 3500);

  close.onclick = () => {
    clearTimeout(toastTimer);
    toast.classList.add("hidden");
  };
}

// Auth storage
const AUTH_KEY = "shophub_auth_v1";

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
};

// UI: view switch
function showView(name) {
  const shop = $("viewShop");
  const admin = $("viewAdmin");
  if (!shop || !admin) return;

  if (name === "admin") {
    shop.classList.add("hidden");
    admin.classList.remove("hidden");
  } else {
    admin.classList.add("hidden");
    shop.classList.remove("hidden");
  }
}

// UI: auth rendering
function updateAuthUI() {
  const authBtnLabel = $("authBtnLabel");
  const sessionInfo = $("sessionInfo");
  const adminRoleChip = $("adminRoleChip");

  const user = state.sessionUser;

  if (authBtnLabel) {
    authBtnLabel.textContent = user ? user.email : "Giriş / Qeydiyyat";
  }

  if (sessionInfo) {
    sessionInfo.textContent = user
      ? `Daxil oldunuz: ${user.email} (${user.role || "user"})`
      : "Daxil olmamısınız.";
  }

  if (adminRoleChip) {
    adminRoleChip.textContent = user ? user.role || "user" : "guest";
  }

  // updateAuthUI funksiyasının daxilinə əlavə et
const adminBtn = document.getElementById("navAdminBtn");
if (adminBtn) {
    if (isAdmin()) {
        console.log("İstifadəçi admindir, düymə göstərilir...");
        adminBtn.classList.remove("hidden");
        adminBtn.style.display = "block"; // Tailwind klası işləməsə, birbaşa style ilə göstər
    } else {
        adminBtn.classList.add("hidden");
        adminBtn.style.display = "none";
    }
}
}

function isAdmin() {
  // backend case-sensitive check: "admin"
  return state.sessionUser?.role === "admin";
}

// Auth modal open/close
function openAuthModal() {
  $("authBackdrop")?.classList.add("show");
}
function closeAuthModal() {
  $("authBackdrop")?.classList.remove("show");
  // reset panels
  $("resetPanel")?.classList.add("hidden");
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
  // sən hələ “offline demo” da saxlaya bilərsən, amma backend var deyə real çəkək.
  // backend hazır deyilsə 404 verər — o halda demo data qoyacağıq.
  try {
    const data = await apiFetch("/api/products", {
      method: "GET",
      auth: false,
    });
    // data ya array ola bilər, ya {items: []} ola bilər. Biz elastik götürürük:
    const items = Array.isArray(data)
      ? data
      : data?.items || data?.products || [];
    state.products = Array.isArray(items) ? items : [];
  } catch (e) {
    // fallback demo
    state.products = demoProducts();
    showToast({
      title: "Qeyd",
      message: "Backend məhsullar gəlmədi — demo məhsullara keçdim.",
      type: "warn",
    });
  }

  renderKPIs();
  renderProducts();
  initFiltersFromProducts();
}

function demoProducts() {
  return [
    {
      id: 1,
      name: "Apple iPhone 15 Pro",
      price: 3299,
      stock: 8,
      category: "Telefon",
      brand: "Apple",
      color: "Qara",
      rating: 4.8,
      images: [
        "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1200&q=80",
      ],
      specs: ["A17 Pro", "256GB", "USB-C", "ProMotion 120Hz"],
    },
    {
      id: 2,
      name: "Logitech MX Master 3S",
      price: 219,
      stock: 4,
      category: "Aksesuar",
      brand: "Logitech",
      color: "Boz",
      rating: 4.6,
      images: [
        "https://images.unsplash.com/photo-1585325701956-60dd9c8553bc?auto=format&fit=crop&w=1200&q=80",
      ],
      specs: ["Ergonomik", "USB-C şarj", "Multi-device"],
    },
    {
      id: 3,
      name: "AirPods Pro 2",
      price: 499,
      stock: 0,
      category: "Audio",
      brand: "Apple",
      color: "Ağ",
      rating: 4.7,
      images: [
        "https://images.unsplash.com/photo-1585386959984-a41552231693?auto=format&fit=crop&w=1200&q=80",
      ],
      specs: ["ANC", "Spatial Audio", "MagSafe"],
    },
  ];
}

// KPIs
function renderKPIs() {
  const products = state.products;

  const categories = new Set(products.map((p) => p.category).filter(Boolean));
  const users = []; // backend users endpoint varsa sonra edərik
  const orders = []; // cart->checkout hissəsində dolduracağıq

  $("kpiProducts") && ($("kpiProducts").textContent = String(products.length));
  $("kpiCategories") &&
    ($("kpiCategories").textContent = String(categories.size));
  $("kpiOrders") && ($("kpiOrders").textContent = String(orders.length));
  $("kpiUsers") && ($("kpiUsers").textContent = String(users.length));
}

function renderAdminTable() {
    const tableBody = $("adminProductsTable");
    if (!tableBody) return;

    tableBody.innerHTML = state.products.map(p => `
        <tr class="hover:bg-white/5 transition-colors">
            <td class="px-6 py-4 font-medium text-white">${productName(p)}</td>
            <td class="px-6 py-4">${formatMoneyAZN(productPrice(p))}</td>
            <td class="px-6 py-4">
                <span class="chip ${productStock(p) > 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}">
                    ${productStock(p)} ədəd
                </span>
            </td>
            <td class="px-6 py-4">
                <button class="text-red-500 hover:text-red-400 font-bold" onclick="deleteProduct(${getProductId(p)})">Sil</button>
            </td>
        </tr>
    `).join("");
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
  return p.category ?? p.Category ?? "Digər";
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

function productImages(p) {
  const imgs = p.images ?? p.Images ?? [];
  if (Array.isArray(imgs) && imgs.length) return imgs;
  return [
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80",
  ];
}

function initFiltersFromProducts() {
  const categorySelect = $("categorySelect");
  const brandSelect = $("brandSelect");
  const colorSelect = $("colorSelect");

  if (!categorySelect || !brandSelect || !colorSelect) return;

  const categories = [
    "Hamısı",
    ...new Set(state.products.map(productCategory)),
  ];
  const brands = ["Hamısı", ...new Set(state.products.map(productBrand))];
  const colors = ["Hamısı", ...new Set(state.products.map(productColor))];

  categorySelect.innerHTML = categories
    .map((x) => `<option value="${x}">${x}</option>`)
    .join("");
  brandSelect.innerHTML = brands
    .map((x) => `<option value="${x}">${x}</option>`)
    .join("");
  colorSelect.innerHTML = colors
    .map((x) => `<option value="${x}">${x}</option>`)
    .join("");

  // admin filters (optional)
  $("admProductCategory") &&
    ($("admProductCategory").innerHTML = [
      "Hamısı",
      ...new Set(state.products.map(productCategory)),
    ]
      .map((x) => `<option value="${x}">${x}</option>`)
      .join(""));
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
          <img src="${img}" alt="${productName(p)}" class="w-full h-full object-cover"/>
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
  const shipping = subtotal > 0 ? 0 : 0; // demo
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
  $("pmReviews") && ($("pmReviews").textContent = "Demo rəylər");

  // add button
  const addBtn = $("pmAddBtn");
  if (addBtn) addBtn.onclick = () => addToCart(id);

  $("productBackdrop")?.classList.add("show");
}

function closeProductModal() {
  $("productBackdrop")?.classList.remove("show");
}

// Admin gate
function goAdmin() {
  if (!state.sessionUser) {
    showToast({
      title: "Giriş lazımdır",
      message: "Admin üçün əvvəlcə daxil olun.",
      type: "warn",
    });
    openAuthModal();
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
  showView("admin");
  renderAdminTable(); // Bu sətri əlavə et
}

// Bind UI events
function bindEvents() {
  // footer year
  $("year") && ($("year").textContent = String(new Date().getFullYear()));

  // navigation
  $("navShopBtn") && ($("navShopBtn").onclick = () => showView("shop"));
  $("navShopBtn2") && ($("navShopBtn2").onclick = () => showView("shop"));

  $("navAdminBtn") && ($("navAdminBtn").onclick = goAdmin);
  $("navAdminBtn2") && ($("navAdminBtn2").onclick = goAdmin);

  // Modal daxilində Login/Register keçidi
$("showRegister").onclick = () => {
  $("loginPanel").classList.add("hidden");
  $("registerPanel").classList.remove("hidden");
  $("showRegister").classList.add("text-white", "border-b-2", "border-blue-600");
  $("showRegister").classList.remove("text-slate-500");
  $("showLogin").classList.remove("text-white", "border-b-2", "border-blue-600");
  $("showLogin").classList.add("text-slate-500");
};

$("showLogin").onclick = () => {
  $("registerPanel").classList.add("hidden");
  $("loginPanel").classList.remove("hidden");
  $("showLogin").classList.add("text-white", "border-b-2", "border-blue-600");
  $("showLogin").classList.remove("text-slate-500");
  $("showRegister").classList.remove("text-white", "border-b-2", "border-blue-600");
  $("showRegister").classList.add("text-slate-500");
};

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
  $("loginBtn") &&
    ($("loginBtn").onclick = async () => {
      const email = ($("loginEmail")?.value || "").trim();
      const pass = $("loginPass")?.value || "";
      if (!email || !pass) {
        showToast({
          title: "Xəta",
          message: "Email və şifrə daxil edin.",
          type: "warn",
        });
        return;
      }
      try {
        await doLogin(email, pass);
        closeAuthModal();
      } catch (e) {
        showToast({
          title: "Login alınmadı",
          message: e.message || "Xəta",
          type: "danger",
        });
      }
    });

  // register (if backend has endpoint; otherwise shows info)
  // Register (Real integration)
$("registerBtn") && ($("registerBtn").onclick = async () => {
  const email = ($("regEmail")?.value || "").trim();
  const pass = $("regPass")?.value || "";
  
  if (!email || !pass) {
    showToast({ title: "Xəta", message: "Email və şifrə daxil edin.", type: "warn" });
    return;
  }

  try {
    // Backend-ə qeydiyyat sorğusu göndəririk
    await apiFetch("/api/auth/register", {
      method: "POST",
      body: { email, password: pass },
      auth: false
    });

    showToast({ 
      title: "Qeydiyyat uğurludur", 
      message: "Hesabınız yaradıldı. İndi giriş edə bilərsiniz.", 
      type: "success" 
    });

    // İstifadəçini avtomatik login panelinə yönləndirmək olar
    // Və ya birbaşa login etmək:
    await doLogin(email, pass);
    closeAuthModal();

  } catch (e) {
    showToast({
      title: "Qeydiyyat xətası",
      message: e.message || "Bu email artıq istifadə olunur.",
      type: "danger"
    });
  }
});

  // logout
  ["logoutBtn", "logoutBtn2"]
    .map($)
    .filter(Boolean)
    .forEach((b) => (b.onclick = doLogout));

  // reset password (demo UI only)
  $("openResetBtn") && ($("openResetBtn").onclick = openResetPanel);
  $("closeResetBtn") && ($("closeResetBtn").onclick = closeResetPanel);
  $("resetPassBtn") &&
    ($("resetPassBtn").onclick = () => {
      showToast({
        title: "Demo",
        message: "Şifrə sıfırlama backend-də ayrıca yazılmalıdır.",
        type: "info",
      });
    });

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

  // cart drawer buttons
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

  // checkout (demo for now)
  async function processCheckout() {
    if (state.cart.length === 0) {
      showToast({
        title: "Səbət boşdur",
        message: "Sifariş üçün məhsul əlavə edin.",
        type: "warn",
      });
      return;
    }

    // İstifadəçinin daxil olub-olmadığını yoxlayırıq
    if (!state.sessionUser) {
      showToast({
        title: "Giriş lazımdır",
        message: "Sifariş üçün daxil olun.",
        type: "warn",
      });
      openAuthModal();
      return;
    }
    try {
      // Backend-in gözlədiyi formatda data hazırlayırıq
      const orderData = {
        items: state.cart.map((item) => ({
          productId: item.productId,
          quantity: item.qty,
          price: item.productSnapshot.price,
        })),
        totalAmount: cartTotals().total,
      };

      // Real API sorğusu
      await apiFetch("/api/orders", {
        method: "POST",
        body: orderData,
        auth: true,
      });

      // Uğurlu sifarişdən sonra
      clearCart(); // Səbəti təmizləyirik
      closeCart(); // Səbət panelini bağlayırıq

      showToast({
        title: "Sifariş uğurludur!",
        message: "Sifarişiniz qəbul edildi. Tezliklə əlaqə saxlanılacaq.",
        type: "success",
      });
    } catch (error) {
      showToast({
        title: "Sifariş alınmadı",
        message: error.message || "Xəta baş verdi.",
        type: "danger",
      });
    }
  }

  // Düyməyə bağlayırıq
  $("checkoutBtn").onclick = processCheckout;

  // product modal close
  $("closeProductModal") &&
    ($("closeProductModal").onclick = closeProductModal);
  $("productBackdrop") &&
    ($("productBackdrop").onclick = (e) => {
      if (e.target?.id === "productBackdrop") closeProductModal();
    });
}

// Boot
async function init() {
  bindEvents();
  loadCart();
  await loadSessionFromToken(); // token varsa sessiyanı real yoxlayır
  await loadProducts(); // məhsulları çəkir (alınmasa demo)
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
