import { getProductById, getProductsPaginated } from "./services/product.service.js";
import { addToCart } from "./services/cart.service.js";

const $ = (selector) => document.querySelector(selector);

function formatPrice(value) {
  return `$${Number(value || 0).toLocaleString("en-US")}`;
}

function getMainImage(product) {
  const images = product.Images || product.images || [];
  return images[0]?.Url || images[0]?.url || "https://placehold.co/1200x900?text=Product";
}

function detailHref(id) {
  return `/src/pages/product-detail.html?id=${id}`;
}

function renderSimilarProducts(items) {
  const target = $("#similarProducts");
  if (!target) return;

  if (!items.length) {
    target.innerHTML =
      '<p style="margin:0;color:#6b7280;font-size:16px">No similar products found.</p>';
    return;
  }

  target.innerHTML = items
    .map(
      (item) => `
      <a class="card" href="${detailHref(item.Id)}">
        <div class="card-media">
          <img src="${getMainImage(item)}" alt="${item.Name || "Product"}" />
        </div>
        <div class="card-body">
          <div class="card-cat">${item.CategoryName || "Product"}</div>
          <div class="card-name">${item.Name || "Product"}</div>
          <div class="card-price">${formatPrice(item.Price)}</div>
        </div>
      </a>
    `,
    )
    .join("");
}

async function loadSimilarProducts(currentProduct) {
  try {
    const response = await getProductsPaginated({ page: 1, pageSize: 40 });
    const similar = (response.items || [])
      .filter((item) => item.Id !== currentProduct.Id)
      .filter((item) => {
        if (currentProduct.CategoryId && item.CategoryId) {
          return item.CategoryId === currentProduct.CategoryId;
        }
        return (item.Brand || "") === (currentProduct.Brand || "");
      })
      .slice(0, 3);

    renderSimilarProducts(similar);
  } catch {
    renderSimilarProducts([]);
  }
}

function renderProduct(product) {
  const detail = $("#productDetail");
  if (!detail) return;

  const title = product.Name || "Product";
  const category = product.CategoryName || "Necklaces";
  const description =
    product.Description ||
    "Exquisite piece designed with premium materials and timeless aesthetics.";
  const material = product.Brand || "14k Yellow Gold";
  const stock = Number(product.Stock || 0);

  detail.innerHTML = `
    <div class="detail-media">
      <img src="${getMainImage(product)}" alt="${title}" />
    </div>

    <div class="content">
      <p class="cat">${category}</p>
      <h1 class="title">${title}</h1>
      <p class="price">${formatPrice(product.Price)}</p>

      <div class="sep"></div>
      <p class="desc">${description}</p>
      <div class="sep"></div>

      <p class="label">Material</p>
      <p class="value">${material}</p>

      <p class="label">Quantity</p>
      <div class="qty-row">
        <button class="qty-btn" id="qtyMinus" type="button" aria-label="Decrease quantity">−</button>
        <span class="qty-value" id="qtyValue">1</span>
        <button class="qty-btn" id="qtyPlus" type="button" aria-label="Increase quantity">+</button>
      </div>

      <div class="mt-6 space-y-2">
        <button
          id="addCartBtn"
          class="w-full rounded-xl bg-slate-900 px-5 py-4 text-base font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:text-slate-100 sm:text-lg"
          type="button"
          ${stock <= 0 ? "disabled" : ""}
        >
          ${stock <= 0 ? "Out of Stock" : "Add to Cart"}
        </button>
        <p class="text-sm text-slate-500">${stock > 0 ? `Available stock: ${stock}` : "Temporarily unavailable"}</p>
      </div>
    </div>
  `;

  let qty = 1;
  const qtyValue = $("#qtyValue");

  $("#qtyMinus")?.addEventListener("click", () => {
    qty = Math.max(1, qty - 1);
    if (qtyValue) qtyValue.textContent = String(qty);
  });

  $("#qtyPlus")?.addEventListener("click", () => {
    const maxAllowed = Math.max(1, stock || 50);
    qty = Math.min(maxAllowed, qty + 1);
    if (qtyValue) qtyValue.textContent = String(qty);
  });

  $("#addCartBtn")?.addEventListener("click", () => {
    if (stock <= 0) return;
    addToCart(product.Id, qty);
  });
}

async function init() {
  const detail = $("#productDetail");
  const backLink = document.querySelector(".back-link");
  const productId = Number(new URLSearchParams(window.location.search).get("id"));

  if (!productId) {
    if (detail) detail.innerHTML = '<p style="margin:0;color:#dc2626">Invalid product id.</p>';
    return;
  }

  try {
    const data = await getProductById(productId);
    const product = data.product || data;
    if (backLink && product.CategoryName) {
      backLink.href = `/src/pages/products.html?category=${encodeURIComponent(product.CategoryName)}`;
    }

    renderProduct(product);
    await loadSimilarProducts(product);
  } catch {
    if (detail) detail.innerHTML = '<p style="margin:0;color:#dc2626">Product not found.</p>';
    renderSimilarProducts([]);
  }
}

init();
