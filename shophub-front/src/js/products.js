import { $ } from "./utils/dom.js";
import { getProducts } from "./services/product.service.js"; //
import { addToCart } from "./services/cart.service.js"; //

async function renderProducts() {
    const grid = $("#productsGrid");
    try {
        const products = await getProducts(); //
        grid.innerHTML = products.map(p => `
            <div class="bg-white p-4 rounded-lg shadow border">
                <h3 class="font-bold">${p.Name}</h3>
                <p class="text-indigo-600 font-bold">${p.Price} AZN</p>
                <button onclick="handleAdd(${p.Id})" class="mt-4 w-full bg-black text-white py-2 rounded">
                    Səbətə at
                </button>
            </div>
        `).join("");
    } catch (err) {
        grid.innerHTML = `<p class='text-red-500'>${err.message}</p>`;
    }
}

window.handleAdd = (id) => {
    addToCart(id, 1); //
    alert("Səbətə əlavə olundu!");
};

renderProducts();