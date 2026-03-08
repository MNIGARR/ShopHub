import { getUser, logout } from "../services/auth.service.js";

const links = [
  ["/admin", "Dashboard"],
  ["/admin/products", "Məhsullar"],
  ["/admin/orders", "Sifarişlər"],
  ["/admin/categories", "Kateqoriyalar"],
  ["/admin/users", "İstifadəçilər"],
];

export function renderAdminLayout({ pageTitle, contentHtml }) {
  const app = document.getElementById("app");
  const currentPath = window.location.pathname;
  const user = getUser();

  app.innerHTML = `
    <header class="admin-header">
      <div class="admin-container admin-header-row">
        <a href="/" class="admin-brand" aria-label="ShopHub home">
          <span class="brand-mark">🛍️</span>
          <span class="brand-serif">Shop<span class="brand-accent">Hub</span></span>
        </a>
        <a href="/" class="btn btn-light">Mağazaya qayıt</a>
      </div>
    </header>

    <div class="admin-container admin-shell">
      <aside class="admin-sidebar">
        <h1>Admin Panel</h1>
        <nav>
          ${links
            .map(
              ([href, label]) =>
                `<a href="${href}" class="admin-link ${currentPath === href ? "active" : ""}">${label}</a>`,
            )
            .join("")}
        </nav>
      </aside>

      <main class="admin-main">
        <header class="admin-topbar glass">
          <div>
            <h2>${pageTitle}</h2>
            <p>${user?.email || "Admin"}</p>
          </div>
          <button id="logoutBtn" class="btn btn-danger">Çıxış</button>
        </header>
        <section class="admin-content glass">${contentHtml}</section>
      </main>
    </div>
  `;

  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    logout();
    window.location.href = "/login";
  });
}

export function showPageError(message) {
  const root = document.getElementById("pageRoot");
  if (!root) return;
  root.innerHTML = `<p class="error">${message}</p>`;
}