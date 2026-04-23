import { $ } from "./utils/dom.js";
import { getProductsPaginated } from "./services/product.service.js";
import { addToCart } from "./services/cart.service.js";

const state = {
  page: 1,
  pageSize: 12,
  total: 0,
  totalPages: 1,
};

function productHref(id) {
  return `/src/pages/product-detail.html?id=${id}`;
}

function getImage(product) {
  const images = product.Images || [];
  return images[0]?.url || images[0]?.Url || "https://placehold.co/640x480?text=No+Image";
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

    for (let p = start; p <= end; p += 1) {
      const btn = document.createElement("button");
      btn.textContent = String(p);
      btn.className = `px-3 py-1 rounded-md border text-sm ${p === state.page ? "bg-indigo-500 text-white border-indigo-400" : "bg-slate-900 border-white/20 text-slate-200"}`;      btn.onclick = () => loadPage(p);
      pageNumbers.appendChild(btn);
    }
  }

  if (totalInfo) {
    const from = state.total === 0 ? 0 : (state.page - 1) * state.pageSize + 1;
    const to = Math.min(state.total, state.page * state.pageSize);
    totalInfo.textContent = `${from}–${to} / ${state.total} • Səhifə ${state.page}/${state.totalPages}`;
  }
}

async function loadPage(page) {
  const grid = $("#productsGrid");
  if (!grid) return;

  try {
    const data = await getProductsPaginated({ page, pageSize: state.pageSize });
    state.page = data.page;
    state.pageSize = data.pageSize;
    state.total = data.total;
    state.totalPages = Math.max(1, data.totalPages);

    grid.innerHTML = data.items
      .map((p) => {
        const inStock = Number(p.Stock || 0) > 0;
        return `
          <a href="${productHref(p.Id)}" class="group block rounded-2xl border border-white/10 bg-slate-900/70 p-4 hover:border-indigo-400/70 transition">
            <div class="aspect-[4/3] overflow-hidden rounded-xl bg-slate-800">
              <img src="${getImage(p)}" alt="${p.Name}" class="h-full w-full object-cover transition group-hover:scale-105" />
            </div>
            <h3 class="mt-3 font-bold text-lg line-clamp-2">${p.Name}</h3>
            <p class="mt-1 text-indigo-300 font-bold">${Number(p.Price || 0).toFixed(2)} AZN</p>
            <p class="text-xs mt-1 ${inStock ? "text-emerald-300" : "text-rose-300"}">${inStock ? `Stok: ${p.Stock}` : "Stok yoxdur"}</p>
            <button data-add-id="${p.Id}" class="add-to-cart mt-4 w-full rounded-lg bg-black/80 text-white py-2 hover:bg-black transition" ${inStock ? "" : "disabled"}>
              Səbətə at
            </button>
          </a>
        `;
      })
      .join("");

    grid.querySelectorAll(".add-to-cart").forEach((btn) => {
        btn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        addToCart(Number(btn.dataset.addId), 1);
      });
    });

    renderPagination();
  } catch (err) {
    grid.innerHTML = `<p class='text-red-500'>${err.message}</p>`;
  }
}

$("#prevPage")?.addEventListener("click", () => loadPage(state.page - 1));
$("#nextPage")?.addEventListener("click", () => loadPage(state.page + 1));

loadPage(1);
