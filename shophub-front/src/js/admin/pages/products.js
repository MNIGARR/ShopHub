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
          <input id="imageFile" type="file" accept="image/*" required />
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
      const categoryId = Number(categoryIdEl.value);
      if (!Number.isFinite(categoryId) || categoryId <= 0) {
        throw new Error("Məhsul üçün kateqoriya seçilməlidir.");
      }

let images = [];
      const file = imageFileEl.files[0];
      if (file) {
        try {
          const image = await uploadImage(file);
          if (image) images = [image];
        } catch (uploadErr) {
          const uploadMessage = uploadErr?.message || "Şəkil yüklənmədi";
          alert(`${uploadMessage}. Məhsul şəkilsiz yaradılacaq.`);
        }
      }
      await adminService.createProduct({
        name: nameEl.value,
        price: Number(priceEl.value),
        stock: Number(stockEl.value),
        categoryId,
        images,
      });

      createFormEl.reset();
      await hydratePage();
    } catch (err) {
      const message = err?.message || "Məhsul əlavə edilərkən xəta baş verdi.";
      alert(message);
    }
  };

  editFormEl.onsubmit = async (e) => {
    e.preventDefault();
    await adminService.updateProduct(Number(editIdEl.value), {
      name: editNameEl.value,
      price: Number(editPriceEl.value),
      stock: Number(editStockEl.value),
    });
    editFormEl.hidden = true;
    await loadProducts();
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
