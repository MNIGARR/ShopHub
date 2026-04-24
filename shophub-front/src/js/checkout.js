import { getCart, setCart, clearCart } from "./services/cart.service.js";
import { getUser } from "./services/auth.service.js";
import { apiFetch } from "./api/http.js";
import { endpoints } from "./api/endpoints.js";
import { getProductById } from "./services/product.service.js";

const SHIPPING_FEE = 5;
const FREE_SHIPPING_MIN = 150;

function formatAZN(value) {
  return `₼${Number(value || 0).toFixed(2)}`;
}

function getShippingFee(subtotal) {
  return subtotal >= FREE_SHIPPING_MIN ? 0 : SHIPPING_FEE;
}

function normalizeQty(qty) {
  const q = Number(qty || 0);
  return Number.isFinite(q) && q > 0 ? Math.floor(q) : 1;
}

async function enrichCartItems(cart) {
  return Promise.all(
    cart.map(async (item) => {
      const qty = normalizeQty(item.qty);
      const snapshot = item.productSnapshot || null;

      if (snapshot) {
        return {
          productId: Number(item.productId),
          qty,
          name: snapshot.Name || snapshot.name || `Məhsul #${item.productId}`,
          price: Number(snapshot.Price ?? snapshot.price ?? 0),
          image: (snapshot.ImageUrls && snapshot.ImageUrls[0]) || snapshot.ImageUrl || null,
        };
      }

      try {
        const data = await getProductById(item.productId);
        const product = data.product || data;
        return {
          productId: Number(item.productId),
          qty,
          name: product?.Name || product?.name || `Məhsul #${item.productId}`,
          price: Number(product?.Price || product?.price || 0),
          image: (product?.ImageUrls && product.ImageUrls[0]) || product?.ImageUrl || null,
        };
      } catch (err) {
        console.warn(`Məhsul ${item.productId} yüklənə bilmədi:`, err);
        return {
          productId: Number(item.productId),
          qty,
          name: `Məhsul #${item.productId}`,
          price: 0,
          image: null,
        };
      }
    }),
  );
}

async function initCheckout() {
  const container = document.getElementById("checkoutItems");
  const emptyState = document.getElementById("emptyState");
  const checkoutBtn = document.getElementById("btnCheckout");
  const msg = document.getElementById("msg");
  const subtotalEl = document.getElementById("subtotal");
  const shippingEl = document.getElementById("shippingFee");
  const totalEl = document.getElementById("totalPrice");
  const itemCountEl = document.getElementById("itemCount");

  if (!container || !checkoutBtn) return;

  let cart = getCart();
  let items = await enrichCartItems(cart);

  const render = () => {
    const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
    const shippingFee = getShippingFee(subtotal);
    const total = subtotal + shippingFee;
    const count = items.reduce((sum, item) => sum + item.qty, 0);

    if (!items.length) {
      container.innerHTML = "";
      if (emptyState) emptyState.style.display = "block";
      checkoutBtn.disabled = true;
    } else {
      if (emptyState) emptyState.style.display = "none";
      checkoutBtn.disabled = false;

      container.innerHTML = items
        .map(
          (item) => `
          <article class="row">
            <div class="row-left">
              <img src="${item.image || "https://placehold.co/56x56?text=No+Image"}" alt="${item.name}" class="img" />
              <div style="min-width: 0;">
                <p style="margin:0;font-weight:600;overflow:hidden;text-overflow:ellipsis;">${item.name}</p>
                <p class="muted" style="margin:4px 0 0">${formatAZN(item.price)} / ədəd</p>
              </div>
            </div>

            <div class="qty">
              <button data-dec="${item.productId}" class="qbtn" type="button">−</button>
              <span style="min-width:18px;text-align:center;">${item.qty}</span>
              <button data-inc="${item.productId}" class="qbtn" type="button">+</button>
              <button data-remove="${item.productId}" class="remove" type="button">✕</button>
            </div>
          </article>
        `,
        )
        .join("");
    }

    if (subtotalEl) subtotalEl.textContent = formatAZN(subtotal);
    if (shippingEl) shippingEl.textContent = formatAZN(shippingFee);
    if (totalEl) totalEl.textContent = formatAZN(total);
    if (itemCountEl) itemCountEl.textContent = `${count} məhsul`;
  };

  const persistCart = () => {
    const next = items.map((item) => ({ 
      productId: Number(item.productId), 
      qty: normalizeQty(item.qty) 
    }));
    setCart(next);
    window.dispatchEvent(new Event("cart:changed"));
  };

  const persistAndReRender = () => {
    persistCart();
    render();
  };

  container.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;

    const inc = target.getAttribute("data-inc");
    const dec = target.getAttribute("data-dec");
    const remove = target.getAttribute("data-remove");

    if (inc) {
      const item = items.find((x) => Number(x.productId) === Number(inc));
      if (item) item.qty += 1;
      persistAndReRender();
      return;
    }

    if (dec) {
      const item = items.find((x) => Number(x.productId) === Number(dec));
      if (item) {
        item.qty -= 1;
        if (item.qty <= 0) {
          items = items.filter((x) => Number(x.productId) !== Number(dec));
        }
      }
      persistAndReRender();
      return;
    }

    if (remove) {
      items = items.filter((x) => Number(x.productId) !== Number(remove));
      persistAndReRender();
    }
  });

  checkoutBtn.onclick = async () => {
    const user = getUser();
    
    // User yoxlaması
    if (!user) {
      if (msg) {
        msg.textContent = "Sifarişi tamamlamaq üçün giriş edin.";
        msg.style.color = "#d58a00";
      }
      setTimeout(() => {
        window.location.href = "/src/pages/auth/login.html";
      }, 1500);
      return;
    }

    // Səbət boşluğu yoxlaması
    if (!items.length) {
      if (msg) {
        msg.textContent = "Səbət boşdur.";
        msg.style.color = "#d58a00";
      }
      return;
    }

    try {
      checkoutBtn.disabled = true;
      checkoutBtn.textContent = "Göndərilir...";
      if (msg) {
        msg.textContent = "";
        msg.style.color = "";
      }

      const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
      const shippingFee = getShippingFee(subtotal);

      // Backend-ə göndərilən məlumat
      const payload = {
        items: items.map((x) => ({ 
          productId: Number(x.productId), 
          qty: normalizeQty(x.qty) 
        })),
        shippingFee: shippingFee,
      };

      console.log("Checkout payload:", payload);

      // Checkout API çağırış
      const response = await apiFetch(endpoints.orders.checkout(), {
        method: "POST",
        body: payload,
      });

      console.log("Checkout response:", response);

      // Uğurlu sifarış
      clearCart();
      window.dispatchEvent(new Event("cart:changed"));
      localStorage.removeItem("shophub_checkout_draft_v1");

      if (msg) {
        msg.textContent = "✓ Sifarişiniz uğurla tamamlandı. Yönləndirilir...";
        msg.style.color = "#1f9e49";
      }

      // Sifarişlərim səhifəsinə yönləndirmə
      setTimeout(() => {
        window.location.href = "/src/pages/orders.html";
      }, 1500);

    } catch (err) {
      console.error("Checkout error:", err);
      
      if (msg) {
        msg.textContent = err?.message || "Checkout zamanı xəta baş verdi.";
        msg.style.color = "#d94a4a";
      }

      checkoutBtn.disabled = false;
      checkoutBtn.textContent = "Sifarişi tamamla";
    }
  };

  // İlk render
  render();
}

// Səhifə yükləndikdə başlat
initCheckout();