import { $ } from "./utils/dom.js";
import { getCart, clearCart } from "./services/cart.service.js";
import { checkoutOrder } from "./services/order.service.js";
import { getUser } from "./services/auth.service.js";
import { checkoutOrder } from "./services/order.service.js";

async function initCheckout() {
  const cart = getCart(); //
  const container = $("#checkoutItems"); //
  const user = getUser(); //

  const checkoutBtn = document.getElementById("checkoutBtn");
  if (checkoutBtn) {
    checkoutBtn.onclick = async () => {
      // Səbətdəki datanı UI-dan və ya cartService-dən al
      const cartItems = JSON.parse(localStorage.getItem("cart") || "[]");

      if (cartItems.length === 0) return alert("Səbət boşdur!");

      try {
        const orderData = {
          items: cartItems.map((i) => ({ productId: i.id, qty: i.qty })),
          shippingFee: 0,
        };

        const result = await checkoutOrder(orderData);
        alert("Sifarişiniz uğurla tamamlandı! Sifariş No: " + result.orderId);

        // Səbəti təmizlə və UI-ı yenilə
        localStorage.removeItem("cart");
        location.reload();
      } catch (err) {
        alert("Sifariş zamanı xəta: " + err.message);
      }
    };
  }
  if (!cart.length) {
    container.innerHTML = "<p class='p-4 text-gray-500'>Səbətiniz boşdur.</p>";
    $("#btnCheckout").disabled = true;
    return;
  }

  // Səbəti ekranda göstər
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
  $("#btnCheckout").onclick = async () => {
    if (!user) {
      alert("Zəhmət olmasa giriş edin!");
      return (window.location.href = "login.html");
    }

    try {
      const payload = {
        items: cart.map((x) => ({ productId: x.productId, qty: x.qty })),
        shippingFee: 5.0,
      };

      await checkoutOrder(payload); //
      clearCart(); //
      alert("Sifarişiniz uğurla tamamlandı!");
      window.location.href = "orders.html";
    } catch (err) {
      alert("Xəta: " + err.message); //
    }
  };
}

initCheckout();
