import { $, $$ } from "../utils/dom.js";
import { fmtAZN } from "../utils/format.js";
import { getProducts } from "../services/product.service.js";
import { addToCart } from "../services/cart.service.js";
import { renderCartBadge } from "./navbar.js";
import { toast } from "./toast.js";
import { openProductModal } from "./productModal.js";

let all = [];
let state = { viewMode: "grid" };

function getFilters() {
  return {
    q: ($("#searchInput")?.value || "").trim().toLowerCase(),
    minP: Number($("#minPrice")?.value || 0),
    maxP: Number($("#maxPrice")?.value || 0),
    cat: $("#categorySelect")?.value || "all",
    brand: $("#brandSelect")?.value || "all",
    color: $("#colorSelect")?.value || "all",
    stockOnly: Boolean($("#inStockOnly")?.checked),
    sort: $("#sortSelect")?.value || "featured",
  };
}

function applyFilters(list) {
  const f = getFilters();
  let out = list.slice();

  if (f.q) out = out.filter(p => `${p.Name||p.name} ${p.Brand||p.brand} ${p.Category||p.category}`.toLowerCase().includes(f.q));
  if (f.minP) out = out.filter(p => Number(p.Price ?? p.price) >= f.minP);
  if (f.maxP) out = out.filter(p => Number(p.Price ?? p.price) <= f.maxP);
  if (f.stockOnly) out = out.filter(p => Number(p.Stock ?? p.stock ?? 0) > 0);

  if (f.sort === "price_asc") out.sort((a,b) => (a.Price??a.price) - (b.Price??b.price));
  if (f.sort === "price_desc") out.sort((a,b) => (b.Price??b.price) - (a.Price??a.price));

  return out;
}

function render(list) {
  const grid = $("#productsGrid");
  if (!grid) return;

  grid.classList.toggle("grid", state.viewMode === "grid");
  grid.classList.toggle("list", state.viewMode === "list");

  grid.innerHTML = list.map(p => {
    const id = p.Id ?? p.id;
    const name = p.Name ?? p.name ?? "Məhsul";
    const price = p.Price ?? p.price ?? 0;

    return `
      <article class="glass p-4">
        <div class="font-semibold">
          <a href="#" data-open-product="${id}">${name}</a>
        </div>
        <div class="mt-2 font-semibold">${fmtAZN(price)}</div>
        <div class="mt-3 flex gap-2">
          <button class="btn btn-primary" data-add-cart="${id}">Səbətə əlavə et</button>
          <button class="btn" data-open-product="${id}">Detail</button>
        </div>
      </article>
    `;
  }).join("");
}

function wireFilters() {
  ["#searchInput","#minPrice","#maxPrice","#categorySelect","#brandSelect","#colorSelect","#inStockOnly","#sortSelect"]
    .forEach(sel => {
      $(sel)?.addEventListener("input", () => render(applyFilters(all)));
      $(sel)?.addEventListener("change", () => render(applyFilters(all)));
    });

  $("#resetFiltersBtn")?.addEventListener("click", () => {
    $("#searchInput").value = "";
    $("#minPrice").value = "";
    $("#maxPrice").value = "";
    $("#categorySelect").value = "all";
    $("#brandSelect").value = "all";
    $("#colorSelect").value = "all";
    $("#inStockOnly").checked = false;
    $("#sortSelect").value = "featured";
    render(applyFilters(all));
  });

  $("#viewModeGridBtn")?.addEventListener("click", () => {
    state.viewMode = "grid";
    $("#viewModeGridBtn")?.classList.add("btn-primary");
    $("#viewModeListBtn")?.classList.remove("btn-primary");
    render(applyFilters(all));
  });

  $("#viewModeListBtn")?.addEventListener("click", () => {
    state.viewMode = "list";
    $("#viewModeListBtn")?.classList.add("btn-primary");
    $("#viewModeGridBtn")?.classList.remove("btn-primary");
    render(applyFilters(all));
  });

  // Delegate add-cart & open-product (sənin köhnə kodundakı kimi) :contentReference[oaicite:2]{index=2}
  document.addEventListener("click", (e) => {
    const addBtn = e.target.closest("[data-add-cart]");
    if (addBtn) {
      e.preventDefault();
      addToCart(addBtn.dataset.addCart, 1);
      renderCartBadge();
      toast("success", "Səbət", "Məhsul əlavə edildi.");
      return;
    }
    const openBtn = e.target.closest("[data-open-product]");
    if (openBtn) {
      e.preventDefault();
      openProductModal(openBtn.dataset.openProduct);
      return;
    }
  });
}

export async function initProductsUI() {
  try {
    all = await getProducts();
    render(applyFilters(all));
    wireFilters();
  } catch (e) {
    toast("danger", "Products", e.message);
  }
}
