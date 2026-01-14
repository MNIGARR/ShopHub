import { $ } from "../utils/dom.js";
import { toast } from "./toast.js";
import { getCart, clearCart, cartCount } from "../services/cart.service.js";
import { getUser } from "../services/auth.service.js";
import { checkoutOrder } from "../services/order.service.js";
import { renderCartBadge } from "./navbar.js";

function openCart() {
  $("#cartDrawer")?.classList.add("show");
  $("#drawerBackdrop")?.classList.add("show");
  renderCart();
}

function closeCart() {
  $("#cartDrawer")?.classList.remove("show");
  $("#drawerBackdrop")?.classList.remove("show");
}

function renderCart() {
  const list = $("#cartList");
  const cart = getCart();
  if (!list) return;

  if (!cart.length) {
    list.innerHTML = `<div class="muted">Səbət boşdur.</div>`;
    renderCartBadge();
    return;
  }

  list.innerHTML = cart.map(i => `
    <div class="glass p-3 flex items-center justify-between">
      <div>
        <div class="text-sm font-semibold">Product #${i.productId}</div>
        <div class="text-xs muted2">Qty: ${i.qty}</div>
      </div>
      <div class="text-sm">${i.qty}</div>
    </div>
  `).join("");

  renderCartBadge();
}

async function checkout() {
  const u = getUser();
  if (!u) {
    toast("warn", "Checkout", "Əvvəlcə giriş edin.");
    return;
  }
  const cart = getCart();
  if (!cart.length) {
    toast("info", "Checkout", "Səbət boşdur.");
    return;
  }

  try {
    const payload = {
      items: cart.map(x => ({ productId: x.productId, qty: x.qty })),
      shippingFee: 0
    };

    const res = await checkoutOrder(payload);
    toast("success", "Sifariş yaradıldı", `OrderId: ${res.orderId ?? "OK"}`);

    clearCart();
    renderCart();
    closeCart();
  } catch (e) {
    toast("danger", "Checkout xətası", e.message);
  }
}

export function bindCartDrawer() {
  $("#cartBtn")?.addEventListener("click", openCart);
  $("#cartBtnSm")?.addEventListener("click", openCart);
  $("#closeCartBtn")?.addEventListener("click", closeCart);
  $("#drawerBackdrop")?.addEventListener("click", closeCart);

  $("#clearCartBtn")?.addEventListener("click", () => {
    if (!confirm("Səbət təmizlənsin?")) return;
    clearCart();
    renderCart();
    toast("info", "Səbət", "Səbət təmizləndi.");
  });

  $("#checkoutBtn")?.addEventListener("click", checkout);
  $("#quickCheckoutBtn")?.addEventListener("click", openCart);
  $("#startShoppingBtn")?.addEventListener("click", () => { closeCart(); });
}
