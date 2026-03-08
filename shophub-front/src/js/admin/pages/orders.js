import { requireAdminAccess } from "../guard.js";
import { renderAdminLayout, showPageError } from "../layout.js";
import { listAdminOrders, updateOrderStatus } from "../../services/admin.service.js";

const statuses = ["pending", "paid", "shipped", "delivered", "cancelled"];

if (requireAdminAccess()) {
  renderAdminLayout({
    pageTitle: "Sifarişlərin idarəsi",
    contentHtml: `<div id="pageRoot"><table><thead><tr><th>ID</th><th>İstifadəçi</th><th>Status</th><th>Total</th><th>Dəyiş</th></tr></thead><tbody id="rows"></tbody></table></div>`,
  });

  load().catch((e) => showPageError(e.message));
}

async function load() {
  const tbody = document.getElementById("rows");
  const items = await listAdminOrders();
  tbody.innerHTML = items
    .map(
      (o) => `<tr>
      <td>#${o.Id}</td>
      <td>${o.UserEmail}</td>
      <td>${o.Status}</td>
      <td>${o.Total}</td>
      <td><select data-id="${o.Id}">${statuses
        .map((s) => `<option ${s === o.Status ? "selected" : ""} value="${s}">${s}</option>`)
        .join("")}</select></td>
    </tr>`,
    )
    .join("");

  tbody.querySelectorAll("select").forEach((el) => {
    el.addEventListener("change", async () => {
      await updateOrderStatus(Number(el.dataset.id), el.value);
      await load();
    });
  });
}
