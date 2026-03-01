import { $ } from "./utils/dom.js";
import { getProductsPaginated } from "./services/product.service.js";
import { addToCart } from "./services/cart.service.js";

const state = {
  page: 1,
  pageSize: 12,
  total: 0,
  totalPages: 1,
};

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
      btn.className = `px-3 py-1 rounded-md border text-sm ${p === state.page ? "bg-black text-white" : "bg-white"}`;
      btn.onclick = () => loadPage(p);
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
      .map(
        (p) => `
            <div class="bg-white p-4 rounded-lg shadow border">
                <h3 class="font-bold">${p.Name}</h3>
                <p class="text-indigo-600 font-bold">${p.Price} AZN</p>
                <button data-add-id="${p.Id}" class="add-to-cart mt-4 w-full bg-black text-white py-2 rounded">
                    Səbətə at
                </button>
            </div>
        `,
      )
      .join("");

    grid.querySelectorAll(".add-to-cart").forEach((btn) => {
      btn.addEventListener("click", () => {
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
