import { $ } from "../utils/dom.js";
import { toast } from "./toast.js";
import { getCart, clearCart } from "../services/cart.service.js";
import { getUser } from "../services/auth.service.js";
import { renderCartBadge } from "./navbar.js";
import { getProductById } from "../services/product.service.js";

function formatAZN(value) {
  return `${Number(value || 0).toFixed(2)} ₼`;
}

async function enrichCartItems(cart) {
  return Promise.all(
    cart.map(async (item) => {
      try {
        const data = await getProductById(item.productId);
        const product = data?.product || data;
        return {
          productId: Number(item.productId),
          qty: Number(item.qty || 1),
          name: product?.Name || `Məhsul #${item.productId}`,
          price: Number(product?.Price || 0),
          image: product?.Images?.[0]?.Url || product?.Images?.[0]?.url || "https://placehold.co/64x64?text=No+Image",
        };
      } catch {
        return {
          productId: Number(item.productId),
          qty: Number(item.qty || 1),
          name: `Məhsul #${item.productId}`,
          price: 0,
          image: "https://placehold.co/64x64?text=No+Image",
        };
      }
    }),
  );
}

function openCart() {
  $("#cartDrawer")?.classList.add("show");
  $("#drawerBackdrop")?.classList.add("show");
  renderCart();
}

function closeCart() {
  $("#cartDrawer")?.classList.remove("show");
  $("#drawerBackdrop")?.classList.remove("show");
}

async function renderCart() {
  const list = $("#cartList");
  const cart = getCart();
  if (!list) return;

  if (!cart.length) {
    list.innerHTML = `<div class="muted">Səbət boşdur.</div>`;
    renderCartBadge();
    return;
  }

  list.innerHTML = `<div class="muted2 text-sm">Məhsullar yüklənir...</div>`;
  const items = await enrichCartItems(cart);

  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);

  list.innerHTML = items.map(item => `
    <div class="glass p-3 flex items-center justify-between gap-3">
      <div class="flex items-center gap-3 min-w-0">
        <img src="${item.image}" alt="${item.name}" class="w-14 h-14 rounded-xl object-cover border border-white/10" />
        <div class="min-w-0">
          <div class="text-sm font-semibold truncate">${item.name}</div>
          <div class="text-xs muted2">${formatAZN(item.price)} × ${item.qty}</div>
        </div>
      </div>
      <div class="text-sm font-semibold">${formatAZN(item.price * item.qty)}</div>
    </div>
  `).join("");

  list.innerHTML += `
    <div class="mt-2 text-right text-sm muted2">
      Ara cəm: 
        <strong style="color:var(--text, #fff)">${formatAZN(subtotal)}</strong>
    </div>
  `;

  renderCartBadge();
}

async function checkout() {
  const u = getUser();
  if (!u) {
    toast("warn", "Checkout", "Əvvəlcə giriş edin.");
    window.location.href = "/src/pages/auth/login.html";
    return;
  }

  const cart = getCart();
  if (!cart.length) {
    toast("info", "Checkout", "Səbət boşdur.");
    return;
  }
  
  closeCart();
  window.location.href = "/src/pages/checkout.html";
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
