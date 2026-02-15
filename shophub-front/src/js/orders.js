import { $ } from "./utils/dom.js"; //
import { myOrders, getOrderById } from "./services/order.service.js"; //

async function loadOrders() {
    const table = $("#ordersTableBody");
    try {
        const orders = await myOrders(); //
        table.innerHTML = orders.map(o => `
            <tr class="border-b hover:bg-gray-50">
                <td class="p-3">#${o.Id}</td>
                <td class="p-3">${new Date(o.CreatedAt).toLocaleDateString()}</td>
                <td class="p-3 font-bold text-indigo-600">${o.Total} AZN</td>
                <td class="p-3">
                    <button class="bg-gray-200 px-3 py-1 rounded text-sm" onclick="showDetails(${o.Id})">Detallar</button>
                </td>
            </tr>
        `).join("");
    } catch (err) {
        table.innerHTML = `<tr><td colspan="4" class="text-red-500 p-4">${err.message}</td></tr>`;
    }
}

window.showDetails = async (id) => {
    try {
        const data = await getOrderById(id); //
        alert(`Sifariş #${id} detalları:\nStatus: ${data.order.Status}\nCəmi: ${data.order.Total} AZN`);
    } catch (err) {
        alert("Detallar açılmadı: " + err.message);
    }
};

loadOrders();