import { $ } from "../utils/dom.js";
import { toast } from "./toast.js";
import { addToCart } from "../services/cart.service.js";
import { renderCartBadge } from "./navbar.js";

let getById = null;
let currentId = null;

export function initProductModal({ getProductByIdFn }) {
  getById = getProductByIdFn;
}

export function openProductModal(id) {
  const targetId = Number(id);
  if (!targetId) return;
  window.location.href = `/src/pages/product-detail.html?id=${targetId}`;
}

export function closeProductModal() {
  $("#productBackdrop")?.classList.remove("show");
  currentId = null;
}

export function bindProductModal() {
  $("#closeProductModal")?.addEventListener("click", closeProductModal);
  $("#productBackdrop")?.addEventListener("click", (e) => {
    if (e.target === $("#productBackdrop")) closeProductModal();
  });

  $("#pmAddBtn")?.addEventListener("click", () => {
    if (!currentId) return;
    addToCart(currentId, 1);
    renderCartBadge();
    toast("success", "Səbət", "Məhsul əlavə edildi.");
  });

  // thumbs / rating (UI varsa işləyəcək)
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-thumb]");
    if (t) {
      const img = $("#pmImage");
      if (img) img.src = t.dataset.thumb;
    }
    const r = e.target.closest("[data-rate]");
    if (r && currentId) {
      toast("info", "Reytinq", `Qiymət: ${r.dataset.rate}`);
    }
  });
}
