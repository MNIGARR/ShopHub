import { $ } from "./utils/dom.js";
import { getCart, clearCart } from "./services/cart.service.js";
import { checkoutOrder } from "./services/order.service.js";
import { getUser } from "./services/auth.service.js";

async function initCheckout() {
    const cart = getCart(); //
    const container = $("#checkoutItems"); //
    const user = getUser(); //

    if (!cart.length) {
        container.innerHTML = "<p class='p-4 text-gray-500'>Səbətiniz boşdur.</p>";
        $("#btnCheckout").disabled = true;
        return;
    }

    // Səbəti ekranda göstər
    container.innerHTML = cart.map(item => `
        <div class="flex justify-between border-b py-2">
            <span>Məhsul ID: ${item.productId} (x${item.qty})</span>
        </div>
    `).join("");

    // Sifarişi tamamla düyməsi
    $("#btnCheckout").onclick = async () => {
        if (!user) {
            alert("Zəhmət olmasa giriş edin!");
            return window.location.href = "login.html";
        }

        try {
            const payload = {
                items: cart.map(x => ({ productId: x.productId, qty: x.qty })),
                shippingFee: 5.00
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