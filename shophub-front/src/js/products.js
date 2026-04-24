import { $ } from "./utils/dom.js";
import { getProductsPaginated } from "./services/product.service.js";
import { addToCart } from "./services/cart.service.js";
import { apiFetch } from "./api/http.js";
import { endpoints } from "./api/endpoints.js";

const SORT_VALUES = new Set([
  "featured",
  "price_asc",
  "price_desc",
  "newest",
  "rating_desc",
]);

const state = {
  page: 1,
  pageSize: 8,
  total: 0,
  totalPages: 1,
  selectedSort: "featured",
  selectedCategoryId: null,
  selectedCategoryName: "",
  categories: [],
  searchQuery: "",
  pendingCategoryId: null,
  pendingCategoryName: "",
  requestToken: 0,
};

function foldLocale(value = "") {
  return String(value)
    .replace(/[Əə]/g, "e")
    .replace(/[Ğğ]/g, "g")
    .replace(/[İIı]/g, "i")
    .replace(/[Öö]/g, "o")
    .replace(/[Şş]/g, "s")
    .replace(/[Çç]/g, "c")
    .replace(/[Üü]/g, "u")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function getImage(product) {
  const images = product.Images || [];
  return images[0]?.url || images[0]?.Url || "https://placehold.co/600x600?text=No+Image";
}

function productHref(id) {
  return `/src/pages/product-detail.html?id=${id}`;
}

function formatPrice(value) {
  const amount = Number(value || 0);
  return `${amount.toLocaleString("az-AZ", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} AZN`;
}

function parseUrlState() {
  const params = new URLSearchParams(window.location.search);

  const page = Number(params.get("page"));
  state.page = Number.isFinite(page) && page > 0 ? page : 1;

  const sort = params.get("sort") || "featured";
  state.selectedSort = SORT_VALUES.has(sort) ? sort : "featured";

  const categoryId = Number(params.get("categoryId"));
  state.pendingCategoryId = Number.isFinite(categoryId) && categoryId > 0 ? categoryId : null;

  state.pendingCategoryName = (params.get("category") || params.get("cat") || "").trim();
  state.searchQuery = (params.get("q") || "").trim();
}

function updateUrlState() {
  const params = new URLSearchParams();

  if (state.selectedCategoryName) params.set("category", state.selectedCategoryName);
  if (state.selectedCategoryId) params.set("categoryId", String(state.selectedCategoryId));
  if (state.searchQuery) params.set("q", state.searchQuery);
  if (state.selectedSort !== "featured") params.set("sort", state.selectedSort);
  if (state.page > 1) params.set("page", String(state.page));

  const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
  window.history.replaceState({}, "", next);
}

function setSelectedCategory(category) {
  if (!category) {
    state.selectedCategoryId = null;
    state.selectedCategoryName = "";
    return;
  }

  state.selectedCategoryId = Number(category.Id) || null;
  state.selectedCategoryName = category.Name || "";
}

function resolvePendingCategory() {
  let matched = null;

  if (state.pendingCategoryId) {
    matched = state.categories.find((item) => Number(item.Id) === state.pendingCategoryId) || null;
  }

  if (!matched && state.pendingCategoryName) {
    const pending = foldLocale(state.pendingCategoryName);
    matched =
      state.categories.find((item) => foldLocale(item.Name) === pending) ||
      state.categories.find((item) => foldLocale(item.Name).includes(pending) || pending.includes(foldLocale(item.Name))) ||
      null;
  }

  if (matched) {
    setSelectedCategory(matched);
  } else if (state.pendingCategoryName) {
    state.selectedCategoryName = state.pendingCategoryName;
  }

  state.pendingCategoryId = null;
  state.pendingCategoryName = "";
}

async function loadCategories() {
  try {
    const data = await apiFetch(endpoints.categories.list());
    state.categories = Array.isArray(data?.items) ? data.items : [];
  } catch {
    state.categories = [];
  }

  resolvePendingCategory();
  renderCategoryChips();
}

function setSortControl() {
  const sort = $("#sortSelect");
  if (sort) sort.value = state.selectedSort;
  
  const search = $("#searchInput");
  if (search) search.value = state.searchQuery;
}

function updateHeaderTexts() {
  const title = $("#productsTitle");
  const subtitle = $("#productsSubtitle");

  if (!title || !subtitle) return;

  if (state.selectedCategoryName) {
    title.textContent = `${state.selectedCategoryName} Kolleksiyası`;
    subtitle.textContent = `"${state.selectedCategoryName}" kateqoriyası üzrə bütün məhsulları burada kəşf edin.`;
    return;
  }

  title.textContent = "Məhsul Kolleksiyası";
  subtitle.textContent =
    "Gündəlik klassikadan modern vurğuya qədər bütün iShine Accessories modellərini bir arada kəşf edin.";
}

function chipClass(isActive) {
  if (isActive) {
    return "chip-btn chip-btn--active";
  }

  return "chip-btn";
}

function renderCategoryChips() {
  const chips = $("#categoryChips");
  if (!chips) return;

  const allActive = !state.selectedCategoryId;

  const allChip = `
    <button
      type="button"
      data-category-id=""
      class="${chipClass(allActive)}"
    >
      Hamısı
    </button>
  `;

  const categoryChips = state.categories
    .map((category) => {
      const active = Number(category.Id) === Number(state.selectedCategoryId);
      return `
        <button
          type="button"
          data-category-id="${category.Id}"
          class="${chipClass(active)}"
        >
          ${category.Name}
        </button>
      `;
    })
    .join("");

  chips.innerHTML = allChip + categoryChips;

  chips.querySelectorAll("[data-category-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = Number(button.dataset.categoryId);

      if (!id) {
        setSelectedCategory(null);
      } else {
        const selected = state.categories.find((category) => Number(category.Id) === id);
        setSelectedCategory(selected || null);
      }

      state.page = 1;
      updateHeaderTexts();
      renderCategoryChips();
      loadPage(1);
    });
  });
}

function buildRequest(page) {
  const request = {
    page,
    pageSize: state.pageSize,
    sort: state.selectedSort,
  };

  if (state.selectedCategoryId) {
    request.categoryId = state.selectedCategoryId;
  }

  if (state.searchQuery) {
    request.q = state.searchQuery;
  }

  return request;
}

function renderResultCount() {
  const resultCount = $("#resultCount");
  if (!resultCount) return;
  resultCount.textContent = `${state.total} nəticə`;
}

function renderProducts(items) {
  const grid = $("#productsGrid");
  const empty = $("#emptyState");

  if (!grid) return;

  if (!items.length) {
    grid.innerHTML = "";
    empty?.classList.remove("hidden");
    return;
  }

  empty?.classList.add("hidden");

  grid.innerHTML = items
    .map((product) => {
      const inStock = Number(product.Stock || 0) > 0;
      const stockClass = inStock ? "stock-ok" : "stock-out";
      const stockText = inStock ? `Stok: ${product.Stock}` : "Stok yoxdur";

      return `
        <article class="product-card">
          <a href="${productHref(product.Id)}" class="product-link">
            <img src="${getImage(product)}" alt="${product.Name}" class="product-image" />
          </a>

          <div class="product-body">
            <p class="product-cat">${product.CategoryName || "Məhsul"}</p>
            <a href="${productHref(product.Id)}" class="product-name">
              ${product.Name}
            </a>

            <div class="product-meta">
              <p class="product-price">${formatPrice(product.Price)}</p>
              <button
                type="button"
                data-add-id="${product.Id}"
                class="add-to-cart product-add"
                title="Səbətə əlavə et"
                aria-label="Səbətə əlavə et"
                ${inStock ? "" : "disabled"}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="h-5 w-5">
                  <circle cx="9" cy="21" r="1"></circle>
                  <circle cx="20" cy="21" r="1"></circle>
                  <path d="M1 1h4l2.68 12.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                </svg>
              </button>
            </div>

            <p class="product-stock ${stockClass}">${stockText}</p>
          </div>
        </article>
      `;
    })
    .join("");

  grid.querySelectorAll(".add-to-cart").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      addToCart(Number(button.dataset.addId), 1);
    });
  });
}

function renderPagination() {
  const prevBtn = $("#prevPage");
  const nextBtn = $("#nextPage");
  const pageNumbers = $("#pageNumbers");
  const totalInfo = $("#totalInfo");

  if (prevBtn) prevBtn.disabled = state.page <= 1;
  if (nextBtn) nextBtn.disabled = state.page >= state.totalPages;

  if (pageNumbers) {
    const start = Math.max(1, state.page - 2);
    const end = Math.min(state.totalPages, start + 4);
    pageNumbers.innerHTML = "";

    for (let page = start; page <= end; page += 1) {
      const button = document.createElement("button");
      button.textContent = String(page);
      button.className = `page-btn ${page === state.page ? "active" : ""}`;
      button.addEventListener("click", () => loadPage(page));
      pageNumbers.appendChild(button);
    }
  }

  if (totalInfo) {
    const from = state.total === 0 ? 0 : (state.page - 1) * state.pageSize + 1;
    const to = Math.min(state.total, state.page * state.pageSize);
    totalInfo.textContent = `${from} - ${to} / ${state.total} məhsul • Səhifə ${state.page}/${state.totalPages}`;
  }
}

async function loadPage(nextPage = 1) {
  const safePage = Math.max(1, Number(nextPage) || 1);
  const token = ++state.requestToken;

  state.page = safePage;
  updateUrlState();

  try {
    const data = await getProductsPaginated(buildRequest(safePage));
    if (token !== state.requestToken) return;

    state.page = Number(data.page || safePage);
    state.pageSize = Number(data.pageSize || state.pageSize);
    state.total = Number(data.total || 0);
    state.totalPages = Math.max(1, Number(data.totalPages || 1));

    renderResultCount();
    renderProducts(data.items || []);
    renderPagination();
    updateUrlState();
  } catch (error) {
    const grid = $("#productsGrid");
    if (grid) {
      grid.innerHTML = `<p style="border:1px solid #c87c7c;background:#f6dfdf;color:#8e3838;border-radius:12px;padding:12px 14px;">${error.message}</p>`;
    }
  }
}

function bindEvents() {
  const submitSearch = () => {
    const searchInput = $("#searchInput");
    const value = searchInput?.value.trim() || "";
    state.searchQuery = value;
    state.page = 1;
    loadPage(1);
  };

  $("#searchBtn")?.addEventListener("click", submitSearch);
  $("#headerSearchBtn")?.addEventListener("click", () => {
    const searchInput = $("#searchInput");
    if (!searchInput) return;

    const value = searchInput.value.trim();
    searchInput.focus();
    searchInput.scrollIntoView({ behavior: "smooth", block: "center" });

    if (value) submitSearch();
  });

  $("#searchInput")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submitSearch();
    }
  });

  $("#sortSelect")?.addEventListener("change", (event) => {
    const value = event.target.value || "featured";
    state.selectedSort = SORT_VALUES.has(value) ? value : "featured";
    state.page = 1;
    loadPage(1);
  });

  $("#prevPage")?.addEventListener("click", () => {
    if (state.page > 1) loadPage(state.page - 1);
  });

  $("#nextPage")?.addEventListener("click", () => {
    if (state.page < state.totalPages) loadPage(state.page + 1);
  });
}

async function init() {
  parseUrlState();
  setSortControl();
  await loadCategories();

  setSortControl();
  updateHeaderTexts();
  bindEvents();

  await loadPage(state.page);
}

init();
