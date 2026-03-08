const { defineConfig } = require("vite");
const fs = require("node:fs");
const path = require("node:path");

const routeMap = {
  "/": "index.html",
  "/products": "src/pages/products.html",
  "/cart": "src/pages/cart.html",
  "/checkout": "src/pages/checkout.html",
  "/login": "src/pages/auth/login.html",
  "/register": "src/pages/auth/register.html",
  "/profile": "src/pages/profile.html",
  "/orders": "src/pages/orders.html",
  "/admin": "src/pages/admin/dashboard.html",
  "/admin/dashboard": "src/pages/admin/dashboard.html",
  "/admin/products": "src/pages/admin/products.html",
  "/admin/orders": "src/pages/admin/orders.html",
  "/admin/users": "src/pages/admin/users.html",
  "/admin/categories": "src/pages/admin/categories.html",
};

function routePlugin() {
  return {
    name: "custom-route-fallback",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = req.url && req.url.split("?")[0];
        const file = pathname && routeMap[pathname];
        if (!file) return next();

        const fullPath = path.resolve(process.cwd(), file);
        if (!fs.existsSync(fullPath)) return next();

        res.setHeader("Content-Type", "text/html");
        res.end(fs.readFileSync(fullPath, "utf-8"));
      });
    },
  };
}

module.exports = defineConfig({
  plugins: [routePlugin()],
});