import { $ } from "./utils/dom.js";
import { getCart, setCart, clearCart } from "./services/cart.service.js";
import { getUser } from "./services/auth.service.js";
import { checkoutOrder } from "./services/order.service.js";
import { getProductById } from "./services/product.service.js";

const SHIPPING_FEE = 5;
const FREE_SHIPPING_MIN = 150;
const CHECKOUT_DRAFT_KEY = "shophub_checkout_draft_v1";

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
        const { product } = await getProductById(item.productId);
        return {
          productId: Number(item.productId),
          qty,
          name: product?.Name || `Məhsul #${item.productId}`,
          price: Number(product?.Price || 0),
          image: (product?.ImageUrls && product.ImageUrls[0]) || product?.ImageUrl || null,
        };
      } catch {
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

function updateCart(items) {
  const next = items.map((item) => ({ productId: Number(item.productId), qty: normalizeQty(item.qty) }));
  setCart(next);
  localStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("storage"));
  return next;
}

function readCheckoutSeed() {
  const cart = getCart();
  if (cart.length) return cart;

  try {
    const draft = JSON.parse(localStorage.getItem(CHECKOUT_DRAFT_KEY) || "[]");
    if (Array.isArray(draft) && draft.length) {
      setCart(draft);
      return draft;
    }
  } catch {}

  return [];
}

async function initCheckout() {
  const container = $("checkoutItems");
  const emptyState = $("emptyState");
  const checkoutBtn = $("btnCheckout");
  const msg = $("msg");
  const subtotalEl = $("subtotal");
  const shippingEl = $("shippingFee");
  const totalEl = $("totalPrice");
  const itemCountEl = $("itemCount");

  if (!container || !checkoutBtn) return;

  let cart = readCheckoutSeed();
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
              <img src="${item.image || "https://placehold.co/80x80?text=No+Image"}" alt="${item.name}" class="img" />
              <div>
                <p style="margin:0;font-weight:600;">${item.name}</p>
                <p class="muted" style="margin:4px 0 0">${formatAZN(item.price)} / ədəd</p>
              </div>
            </div>

            <div class="qty">
              <button data-dec="${item.productId}" class="qbtn">−</button>
              <span style="min-width:18px;text-align:center;">${item.qty}</span>
              <button data-inc="${item.productId}" class="qbtn">+</button>
              <button data-remove="${item.productId}" class="remove">Sil</button>
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

  const persistAndReRender = () => {
    cart = updateCart(items);
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
    if (!user) {
      if (msg) {
        msg.className = "msg";
        msg.style.color = "#d58a00";
        msg.textContent = "Sifarişi tamamlamaq üçün giriş edin.";
      }
      window.location.href = "/src/pages/auth/login.html";
      return;
    }

    if (!cart.length) {
      if (msg) {
        msg.className = "msg";
        msg.style.color = "#d58a00";
        msg.textContent = "Səbət boşdur.";
      }
      return;
    }

    try {
      checkoutBtn.disabled = true;
      checkoutBtn.textContent = "Göndərilir...";

      const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
      const payload = {
        items: cart.map((x) => ({ productId: Number(x.productId), qty: normalizeQty(x.qty) })),
        shippingFee: getShippingFee(subtotal),
      };

      await checkoutOrder(payload);
      clearCart();
      localStorage.removeItem(CHECKOUT_DRAFT_KEY);
      if (msg) {
        msg.className = "msg";
        msg.style.color = "#1f9e49";
        msg.textContent = "Sifarişiniz uğurla tamamlandı.";
      }
      window.location.href = "/src/pages/orders.html";
    } catch (err) {
      if (msg) {
        msg.className = "msg";
        msg.style.color = "#d94a4a";
        msg.textContent = err?.message || "Checkout zamanı xəta baş verdi.";
      }
      console.error("Checkout error:", err);
    } finally {
      checkoutBtn.disabled = false;
      checkoutBtn.textContent = "Sifarişi tamamla";
    }
  };

  render();
}

  initCheckout();