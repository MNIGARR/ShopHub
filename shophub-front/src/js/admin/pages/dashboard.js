import { requireAdminAccess } from "../guard.js";
import { renderAdminLayout, showPageError } from "../layout.js";
import { getProductsPaginated } from "../../services/product.service.js";
import { listAdminOrders, listUsers, listCategories } from "../../services/admin.service.js";

if (requireAdminAccess()) {
  renderAdminLayout({
    pageTitle: "Dashboard",
    contentHtml: `
      <div id="pageRoot">
        <div class="stats-grid">
          <article class="stat-card"><h3>Məhsullar</h3><p id="productsCount">-</p></article>
          <article class="stat-card"><h3>Sifarişlər</h3><p id="ordersCount">-</p></article>
          <article class="stat-card"><h3>İstifadəçilər</h3><p id="usersCount">-</p></article>
          <article class="stat-card"><h3>Kateqoriyalar</h3><p id="categoriesCount">-</p></article>
        </div>
      </div>
    `,
  });

  loadStats().catch((e) => showPageError(e.message));
}

async function loadStats() {
  const [{ total: productsTotal }, orders, users, categories] = await Promise.all([
    getProductsPaginated({ page: 1, pageSize: 1 }),
    listAdminOrders(),
    listUsers(),
    listCategories(),
  ]);

  document.getElementById("productsCount").textContent = String(productsTotal);
  document.getElementById("ordersCount").textContent = String(orders.length);
  document.getElementById("usersCount").textContent = String(users.length);
  document.getElementById("categoriesCount").textContent = String(categories.length);
}
