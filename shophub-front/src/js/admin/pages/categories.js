import { requireAdminAccess } from "../guard.js";
import { renderAdminLayout, showPageError } from "../layout.js";
import { listCategories, createCategory, updateCategory, deleteCategory } from "../../services/admin.service.js";

if (requireAdminAccess()) {
  renderAdminLayout({
    pageTitle: "Kateqoriyaların idarəsi",
    contentHtml: `
      <div id="pageRoot">
        <form id="createForm" class="inline-form">
          <input id="name" placeholder="Kateqoriya adı" required />
          <button>Əlavə et</button>
        </form>
        <table><thead><tr><th>ID</th><th>Ad</th><th>Əməliyyat</th></tr></thead><tbody id="rows"></tbody></table>
      </div>
    `,
  });

  const createFormEl = document.getElementById("createForm");
  const nameEl = document.getElementById("name");

  createFormEl.onsubmit = async (e) => {
    e.preventDefault();
    await createCategory(nameEl.value.trim());
    createFormEl.reset();
    await load();
  };

  load().catch((e) => showPageError(e.message));
}

async function load() {
  const tbody = document.getElementById("rows");
  const items = await listCategories();
  tbody.innerHTML = items
    .map(
      (c) => `<tr><td>${c.Id}</td><td><input value="${c.Name}" data-name="${c.Id}" /></td><td><button data-save="${c.Id}">Yadda saxla</button> <button data-del="${c.Id}">Sil</button></td></tr>`,
    )
    .join("");

  tbody.querySelectorAll("button[data-save]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = Number(btn.dataset.save);
      const input = tbody.querySelector(`input[data-name='${id}']`);
      await updateCategory(id, input.value.trim());
      await load();
    });
  });

  tbody.querySelectorAll("button[data-del]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await deleteCategory(Number(btn.dataset.del));
      await load();
    });
  });
}