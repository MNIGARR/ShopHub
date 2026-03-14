import { $ } from "./utils/dom.js";
import { getCart, clearCart } from "./services/cart.service.js";
import { getUser } from "./services/auth.service.js";
import { checkoutOrder } from "./services/order.service.js";
import { getProductById } from "./services/product.service.js";

const SHIPPING_FEE = 5;

function formatAZN(value) {
  return `₼${Number(value || 0).toFixed(2)}`;
}

async function enrichCartItems(cart) {
  return Promise.all(
    cart.map(async (item) => {
      const qty = Number(item.qty || 0);
      const snapshot = item.productSnapshot || null;

      if (snapshot) {
        return {
          productId: Number(item.productId),
          qty,
          name: snapshot.Name || snapshot.name || `Məhsul #${item.productId}`,
          price: Number(snapshot.Price ?? snapshot.price ?? 0),
        };
      }

      try {
        const { product } = await getProductById(item.productId);
        return {
          productId: Number(item.productId),
          qty,
          name: product?.Name || `Məhsul #${item.productId}`,
          price: Number(product?.Price || 0),
        };
      } catch {
        return {
          productId: Number(item.productId),
          qty,
          name: `Məhsul #${item.productId}`,
          price: 0,
        };
      }
    }),
  );
}

async function initCheckout() {
  const cart = getCart();
  const container = $("checkoutItems");
  const checkoutBtn = $("btnCheckout");
  const msg = $("msg");
  const subtotalEl = $("subtotal");
  const totalEl = $("totalPrice");

  if (!container || !checkoutBtn) return;

  if (!cart.length) {
    container.innerHTML = "<p class='p-4 text-gray-500'>Səbətiniz boşdur.</p>";
    checkoutBtn.disabled = true;
    if (subtotalEl) subtotalEl.textContent = formatAZN(0);
    if (totalEl) totalEl.textContent = formatAZN(0);
    return;
  }

  const items = await enrichCartItems(cart);
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const total = subtotal + SHIPPING_FEE;

  container.innerHTML = items
    .map(
      (item) => `
        <div class="flex justify-between border-b py-2 gap-3">
          <span>${item.name} (x${item.qty})</span>
          <span class="font-medium">${formatAZN(item.price * item.qty)}</span>
        </div>
      `,
    )
  .join("");

  if (subtotalEl) subtotalEl.textContent = formatAZN(subtotal);
  if (totalEl) totalEl.textContent = formatAZN(total);

  checkoutBtn.onclick = async () => {
    const user = getUser();
    if (!user) {
      if (msg) msg.textContent = "Sifarişi tamamlamaq üçün giriş edin.";
      window.location.href = "/src/pages/auth/login.html";
      return;
    }

    try {
      const payload = {
        items: cart.map((x) => ({ productId: Number(x.productId), qty: Number(x.qty) })),
        shippingFee: SHIPPING_FEE,
      };

      await checkoutOrder(payload);
      clearCart();
      if (msg) msg.textContent = "Sifarişiniz uğurla tamamlandı.";
      window.location.href = "/src/pages/orders.html";
      } catch (err) {
      if (msg) msg.textContent = err?.message || "Checkout zamanı xəta baş verdi.";
        console.error("Checkout error:", err);
    }
  };
}

initCheckout();
