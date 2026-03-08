import { requireAdminAccess } from "../guard.js";
import { renderAdminLayout, showPageError } from "../layout.js";
import { listUsers, setUserActive, setUserRole } from "../../services/admin.service.js";

if (requireAdminAccess()) {
  renderAdminLayout({
    pageTitle: "İstifadəçilərin idarəsi",
    contentHtml: `<div id="pageRoot"><table><thead><tr><th>ID</th><th>Email</th><th>Rol</th><th>Aktivlik</th><th>Əməliyyat</th></tr></thead><tbody id="rows"></tbody></table></div>`,
  });

  load().catch((e) => showPageError(e.message));
}

async function load() {
  const tbody = document.getElementById("rows");
  const items = await listUsers();
  tbody.innerHTML = items
    .map(
      (u) => `<tr>
      <td>${u.Id}</td><td>${u.Email}</td>
      <td>
        <select data-role="${u.Id}">
          <option value="user" ${u.Role === "user" ? "selected" : ""}>user</option>
          <option value="admin" ${u.Role === "admin" ? "selected" : ""}>admin</option>
        </select>
      </td>
      <td>${u.IsActive ? "aktiv" : "blok"}</td>
      <td><button data-active="${u.Id}" data-current="${u.IsActive}">${u.IsActive ? "Blokla" : "Aç"}</button></td>
    </tr>`,
    )
    .join("");

  tbody.querySelectorAll("select[data-role]").forEach((el) => {
    el.addEventListener("change", async () => {
      await setUserRole(Number(el.dataset.role), el.value);
      await load();
    });
  });

  tbody.querySelectorAll("button[data-active]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = Number(btn.dataset.active);
      const current = btn.dataset.current === "true";
      await setUserActive(id, !current);
      await load();
    });
  });
}
