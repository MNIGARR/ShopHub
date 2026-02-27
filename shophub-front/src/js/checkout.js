import { $ } from "./utils/dom.js";
import { getCart, clearCart } from "./services/cart.service.js";
import { getUser } from "./services/auth.service.js";
import { checkoutOrder } from "./services/order.service.js";

async function initCheckout() {
  const cart = getCart();
  const container = $("#checkoutItems");
  const user = getUser();
  const checkoutBtn = $("#btnCheckout");

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
      alert("Zəhmət olmasa giriş edin!");
      window.location.href = "/src/pages/auth/login.html";
      return;
    }

    try {
      const payload = {
        items: cart.map((x) => ({ productId: Number(x.productId), qty: Number(x.qty) })),
        shippingFee: 5,
      };

      await checkoutOrder(payload);
      clearCart();
      alert("Sifarişiniz uğurla tamamlandı!");
      window.location.href = "/src/pages/orders.html";
    } catch (err) {
      alert("Xəta: " + err.message); //
    }
  };
}

initCheckout();
