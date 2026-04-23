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

      <button id="addCartBtn" class="add-btn" type="button" ${stock <= 0 ? "disabled" : ""}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
          <circle cx="9" cy="21" r="1"></circle>
          <circle cx="20" cy="21" r="1"></circle>
          <path d="M1 1h4l2.68 12.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
        </svg>
        <span>${stock <= 0 ? "Out of Stock" : "Add to Cart"}</span>
      </button>

      <div class="sep"></div>

      <div class="perk">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
          <path d="M12 3l7 3v6c0 5-3.5 9-7 10-3.5-1-7-5-7-10V6l7-3z"></path>
        </svg>
        <div>
          <p class="perk-title">Lifetime Warranty</p>
          <p class="perk-text">Comprehensive coverage on all items</p>
        </div>
      </div>

      <div class="perk">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
          <rect x="1.5" y="7.5" width="13" height="9" rx="2"></rect>
          <path d="M14.5 10h4l3 3v3.5h-2"></path>
          <circle cx="6" cy="18" r="1.5"></circle>
          <circle cx="18" cy="18" r="1.5"></circle>
        </svg>
        <div>
          <p class="perk-title">Free Insured Shipping</p>
          <p class="perk-text">Worldwide delivery within 5-7 days</p>
        </div>
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
  const productId = Number(new URLSearchParams(window.location.search).get("id"));

  if (!productId) {
    if (detail) detail.innerHTML = '<p style="margin:0;color:#dc2626">Invalid product id.</p>';
    return;
  }

  try {
    const data = await getProductById(productId);
    const product = data.product || data;

    renderProduct(product);
    await loadSimilarProducts(product);
  } catch {
    if (detail) detail.innerHTML = '<p style="margin:0;color:#dc2626">Product not found.</p>';
    renderSimilarProducts([]);
  }
}

init();
