import { requireAdminAccess } from "../guard.js";
import { renderAdminLayout, showPageError } from "../layout.js";
import { getProductsPaginated, getProductById } from "../../services/product.service.js";
import * as adminService from "../../services/admin.service.js";
import { uploadImage } from "../../cloudinary.js";

if (requireAdminAccess()) {
  renderAdminLayout({
    pageTitle: "Məhsulların idarəsi",
    contentHtml: `
      <div id="pageRoot">
        <form id="createForm" class="inline-form">
          <input id="name" placeholder="Ad" required />
          <input id="price" placeholder="Qiymət" type="number" required />
          <input id="stock" placeholder="Stok" type="number" required />
          <select id="categoryId" required>
            <option value="">Kateqoriya seçin</option>
          </select>
          <input id="imageFile" type="file" accept="image/*" />
          <p id="formMessage" class="muted" aria-live="polite"></p>
          <button>Əlavə et</button>
        </form>
        <h3>Redaktə</h3>
        <form id="editForm" class="inline-form" hidden>
          <input id="editId" type="hidden" />
          <input id="editName" required />
          <input id="editPrice" type="number" required />
          <input id="editStock" type="number" required />
          <button>Yadda saxla</button>
        </form>
        <table><thead><tr><th>ID</th><th>Ad</th><th>Qiymət</th><th>Stok</th><th></th></tr></thead><tbody id="rows"></tbody></table>
      </div>
    `,
  });

  bindForms();
  hydratePage().catch((e) => showPageError(e.message));
}

function setFormMessage(message, type = "info") {
  const messageEl = document.getElementById("formMessage");
  if (!messageEl) return;
  messageEl.textContent = message || "";
  messageEl.style.color = type === "error" ? "#dc2626" : type === "success" ? "#059669" : "#475569";
}

function bindForms() {
  const createFormEl = document.getElementById("createForm");
  const editFormEl = document.getElementById("editForm");
  const nameEl = document.getElementById("name");
  const priceEl = document.getElementById("price");
  const stockEl = document.getElementById("stock");
  const categoryIdEl = document.getElementById("categoryId");
  const imageFileEl = document.getElementById("imageFile");
  const editIdEl = document.getElementById("editId");
  const editNameEl = document.getElementById("editName");
  const editPriceEl = document.getElementById("editPrice");
  const editStockEl = document.getElementById("editStock");

  createFormEl.onsubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (file) {
        try {
          const image = await uploadImage(file);
          if (image) images = [image];
        } catch (uploadErr) {
          const uploadMessage = uploadErr?.message || "Şəkil yüklənmədi";
          setFormMessage(`${uploadMessage}. Məhsul şəkilsiz yaradılacaq.`, "info");
        }
      }
      const file = imageFileEl.files[0];
      if (!file) {
        throw new Error("Məhsul üçün şəkil faylı seçilməlidir.");
      }
      setFormMessage("");

      let images = [];

      const categoryId = Number(categoryIdEl.value);
      if (!Number.isFinite(categoryId) || categoryId <= 0) {
        throw new Error("Məhsul üçün kateqoriya seçilməlidir.");
      }



      const image = await uploadImage(file);

      await adminService.createProduct({
        name: nameEl.value,
        price: Number(priceEl.value),
        stock: Number(stockEl.value),
        categoryId,
        images: image ? [image] : [],
      });

      createFormEl.reset();
      setFormMessage("Məhsul uğurla əlavə edildi.", "success");
      await hydratePage();
    } catch (err) {
      const baseMessage = err?.message || "Məhsul əlavə edilərkən xəta baş verdi.";
      const message = /unknown api key|401/i.test(baseMessage)
        ? "Şəkil yükləmə alınmadı (Cloudinary 401 / Unknown API key). .env-də Cloudinary cloud name və upload preset dəyərlərini yoxlayın."
        : baseMessage;
      alert(message);
    }
  };

  createFormEl.onsubmit = async (e) => {
  e.preventDefault();

  try {
    setFormMessage("");

    const file = imageFileEl?.files?.[0];
    if (!file) {
      setFormMessage("Şəkil seçin.", "error");
      return;
    }

    const categoryId = Number(categoryIdEl.value);
    if (!Number.isFinite(categoryId) || categoryId <= 0) {
      setFormMessage("Kateqoriya seçin.", "error");
      return;
    }

    setFormMessage("Şəkil yüklənir...", "info");
    const imageUrl = await uploadImage(file);

    await adminService.createProduct({
      name: nameEl.value.trim(),
      price: Number(priceEl.value),
      stock: Number(stockEl.value),
      categoryId,
      images: [imageUrl],
    });

    createFormEl.reset();
    setFormMessage("Məhsul əlavə edildi.", "success");
    await hydratePage();
  } catch (err) {
    setFormMessage(err?.message || "Xəta baş verdi.", "error");
    alert(err?.message || "Xəta baş verdi.");
  }
};
}

async function hydratePage() {
  await Promise.all([loadCategories(), loadProducts()]);
}

async function loadCategories() {
  const categorySelect = document.getElementById("categoryId");
  if (!categorySelect) return;

  const categories = await adminService.listCategories();
  categorySelect.innerHTML = [
    '<option value="">Kateqoriya seçin</option>',
    ...categories.map((c) => `<option value="${c.Id}">${c.Name}</option>`),
  ].join("");
}

async function loadProducts() {
  const tbody = document.getElementById("rows");
  const { items } = await getProductsPaginated({ page: 1, pageSize: 24 });
  tbody.innerHTML = items
    .map(
      (p) => `<tr><td>${p.Id}</td><td>${p.Name}</td><td>${p.Price}</td><td>${p.Stock}</td><td><button data-edit="${p.Id}">Redaktə</button> <button data-del="${p.Id}">Sil</button></td></tr>`,
    )
    .join("");

  tbody.querySelectorAll("button[data-del]").forEach((b) => {
    b.onclick = async () => {
      await adminService.deleteProduct(Number(b.dataset.del));
      await loadProducts();
    };
  });

  tbody.querySelectorAll("button[data-edit]").forEach((b) => {
    b.onclick = async () => {
      const id = Number(b.dataset.edit);
      const { product } = await getProductById(id);
      const editFormEl = document.getElementById("editForm");
      document.getElementById("editId").value = id;
      document.getElementById("editName").value = product.Name;
      document.getElementById("editPrice").value = product.Price;
      document.getElementById("editStock").value = product.Stock;
      editFormEl.hidden = false;
    };
  });
}
