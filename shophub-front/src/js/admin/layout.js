import { getUser, logout } from "../services/auth.service.js";

const links = [
  ["/src/pages/admin/dashboard.html", "Dashboard"],
  ["/src/pages/admin/products.html", "Məhsullar"],
  ["/src/pages/admin/orders.html", "Sifarişlər"],
  ["/src/pages/admin/categories.html", "Kateqoriyalar"],
  ["/src/pages/admin/users.html", "İstifadəçilər"],
];

export function renderAdminLayout({ pageTitle, contentHtml }) {
  const app = document.getElementById("app");
  const currentPath = window.location.pathname;
  const user = getUser();

  app.innerHTML = `
    <header class="admin-header">
      <div class="admin-container admin-header-row">
        <a href="/" class="admin-brand" aria-label="ShopHub home">
          <img src="/src/assets/ishine-icon-transparent.png" alt="iShine" class="admin-brand-logo" />
        </a>

        <nav class="admin-global-nav" aria-label="Global navigation">
          <a href="/" class="admin-global-link">Mağaza</a>
          <a href="/src/pages/admin/dashboard.html" class="admin-global-link ${currentPath.includes("/src/pages/admin") ? "active" : ""}">Admin Panel</a>
        </nav>

        <div class="admin-global-actions">
          <button id="themeToggle" type="button" class="icon-btn" aria-label="Tema" title="Tema">☾</button>
          <button class="icon-btn" type="button" aria-label="Hesab" title="${user?.email || "Admin"}">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </button>
        </div>
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
        <header class="admin-topbar">
          <div>
            <h2>${pageTitle}</h2>
            <p>${user?.email || "Admin"}</p>
          </div>
          <button id="logoutBtn" class="btn btn-danger">Çıxış</button>
        </header>
        <section class="admin-content">${contentHtml}</section>
      </main>
    </div>
  `;

  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    logout();
    window.location.href = "/src/pages/auth/login.html";
  });
}

export function showPageError(message) {
  const root = document.getElementById("pageRoot");
  if (!root) return;
  root.innerHTML = `<p class="error">${message}</p>`;
}