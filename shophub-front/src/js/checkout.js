import { $ } from "./utils/dom.js";
import { getCart, clearCart } from "./services/cart.service.js";
import { getUser } from "./services/auth.service.js";
import { checkoutOrder } from "./services/order.service.js";

async function initCheckout() {
  const cart = getCart();
  const container = $("#checkoutItems");
  const user = getUser();
  const checkoutBtn = $("#btnCheckout");
  const msg = $("#msg");

  if (!container || !checkoutBtn) return;

   if (!cart.length) {
    container.innerHTML = "<p class='p-4 text-gray-500'>Səbətiniz boşdur.</p>";
    checkoutBtn.disabled = true;
    return;
  }

  container.innerHTML = cart
    .map(
      (item) => `
        <div class="flex justify-between border-b py-2">
            <span>Məhsul ID: ${item.productId} (x${item.qty})</span>
        </div>
    `,
    )
    .join("");

  // Sifarişi tamamla düyməsi
  checkoutBtn.onclick = async () => {
    if (!user) {
      if (msg) msg.textContent = "Sifarişi tamamlamaq üçün giriş edin.";
      window.location.href = "/login";
      return;
    }

    try {
      const payload = {
        items: cart.map((x) => ({ productId: Number(x.productId), qty: Number(x.qty) })),
        shippingFee: 5,
      };

      await checkoutOrder(payload);
      clearCart();
      if (msg) msg.textContent = "Sifarişiniz uğurla tamamlandı.";
      window.location.href = "/orders";
    } catch (err) {
      if (msg) msg.textContent = err.message;
      console.error("Checkout error:", err);
    }
  };
}

initCheckout();
