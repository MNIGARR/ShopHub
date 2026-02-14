import { $ } from "./utils/dom.js";
import { getCart, clearCart } from "./services/cart.service.js";
import { checkoutOrder } from "./services/order.service.js";
import { getUser } from "./services/auth.service.js";

// Səbəti göstər
function renderCheckout() {
    const cart = getCart();
    const itemsContainer = $("#checkoutItems");
    let subtotal = 0;

    if (cart.length === 0) {
        itemsContainer.innerHTML = `<p class="text-gray-500">Səbətiniz boşdur.</p>`;
        $("#btnCheckout").disabled = true;
        return;
    }

    itemsContainer.innerHTML = cart.map(item => {
        // Qeyd: Məhsul adlarını görmək üçün məhsul detalını gətirmək olar, 
        // amma müvəqqəti olaraq ID və miqdar göstərilir.
        subtotal += (item.price || 0) * item.qty;
        return `
            <div class="flex justify-between border-b pb-2">
                <span>Məhsul ID: ${item.productId} (x${item.qty})</span>
                <span class="font-bold">${((item.price || 0) * item.qty).toFixed(2)} AZN</span>
            </div>
        `;
    }).join("");

    $("#subtotal").innerText = `${subtotal.toFixed(2)} AZN`;
    $("#totalPrice").innerText = `${(subtotal + 5).toFixed(2)} AZN`;
}

// Sifarişi tamamla
$("#btnCheckout").addEventListener("click", async () => {
    const user = getUser();
    if (!user) {
        alert("Sifariş üçün giriş etməlisiniz!");
        window.location.href = "login.html";
        return;
    }

    const cart = getCart();
    const msg = $("#msg");

    const payload = {
        items: cart.map(x => ({ productId: x.productId, qty: x.qty })),
        shippingFee: 5.00
    };

    try {
        $("#btnCheckout").disabled = true;
        msg.innerText = "Sifariş işlənilir... ⏳";
        msg.className = "mt-4 text-center text-sm text-blue-600";

        const res = await checkoutOrder(payload); // Sənin service-in çağırılır

        msg.innerText = "Sifariş uğurla tamamlandı! ✅";
        msg.className = "mt-4 text-center text-sm text-green-600";
        
        clearCart(); // Səbəti təmizlə
        
        setTimeout(() => {
            window.location.href = "orders.html";
        }, 2000);

    } catch (err) {
        msg.innerText = "Xəta: " + err.message;
        msg.className = "mt-4 text-center text-sm text-red-600";
        $("#btnCheckout").disabled = false;
    }
});

renderCheckout();