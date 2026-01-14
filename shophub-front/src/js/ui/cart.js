// src/js/ui/cart.js
import { cartService } from "../services/cart.service.js";
import { showToast } from "./toast.js";

function cartRow(item) {
  return `
    <div class="cart-row" data-product-id="${item.productId}">
      <img class="cart-img" src="${item.imageUrl || "/assets/images/placeholder.png"}" alt="${item.name}">
      <div class="cart-info">
        <div class="cart-name">${item.name}</div>
        <div class="cart-price">${item.price} ₼</div>
      </div>

      <div class="cart-actions">
        <input class="cart-qty" type="number" min="1" value="${item.qty}" />
        <button class="btn btn-danger" data-action="remove-from-cart">Remove</button>
      </div>
    </div>
  `;
}

function renderCart() {
  const listEl = document.getElementById("cartList");
  const summaryEl = document.getElementById("cartSummary");

  if (!listEl || !summaryEl) return;

  const items = cartService.getItems();

  if (!items.length) {
    listEl.innerHTML = "<p>Your cart is empty.</p>";
    summaryEl.innerHTML = `
      <div><strong>Subtotal:</strong> 0 ₼</div>
      <div><strong>Total:</strong> 0 ₼</div>
    `;
    return;
  }

  listEl.innerHTML = items.map(cartRow).join("");

  const totals = cartService.getTotals();
  summaryEl.innerHTML = `
    <div><strong>Subtotal:</strong> ${totals.subtotal} ₼</div>
    <div><strong>Total:</strong> ${totals.total} ₼</div>
  `;
}

function bindCartEvents() {
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;

    const action = btn.getAttribute("data-action");

    if (action === "remove-from-cart") {
      const row = btn.closest("[data-product-id]");
      const pid = row?.getAttribute("data-product-id");
      cartService.remove(pid);
      showToast("Removed from cart", "success");
      renderCart();
    }
  });

  document.addEventListener("change", (e) => {
    const input = e.target.closest(".cart-qty");
    if (!input) return;

    const row = input.closest("[data-product-id]");
    const pid = row?.getAttribute("data-product-id");
    const qty = Number(input.value || 1);

    cartService.updateQty(pid, qty);
    renderCart();
  });
}

export function initCartPage() {
  renderCart();
  bindCartEvents();

  // başqa səhifədən cart dəyişəndə (badge və s.)
  window.addEventListener("cart:changed", () => {
    renderCart();
  });
}
