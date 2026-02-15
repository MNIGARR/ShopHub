import { $ } from "./utils/dom.js";
import { apiFetch } from "./api/http.js"; //
import { endpoints } from "./api/endpoints.js"; //
import { uploadImage } from "./cloudinary.js";

$("#productForm").onsubmit = async (e) => {
    e.preventDefault();
    const btn = $("#submitBtn");
    
    try {
        btn.disabled = true;
        const file = $("#imageInput").files[0];
        if (!file) throw new Error("Şəkil seçilməyib!");

        // 1. Cloudinary-yə yüklə
        const imageUrl = await uploadImage(file);

        // 2. Backend-ə göndər
        await apiFetch(endpoints.products.list(), { //
            method: "POST",
            body: {
                name: $("#name").value,
                price: $("#price").value,
                stock: $("#stock").value,
                categoryId: $("#categoryId").value,
                images: [imageUrl]
            }
        });

        alert("Məhsul yaradıldı!");
        window.location.href = "products.html";
    } catch (err) {
        alert("Xəta: " + err.message);
    } finally {
        btn.disabled = false;
    }
};